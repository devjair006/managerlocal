use pulldown_cmark::{html, Options, Parser};
use serde::Deserialize;

#[derive(Deserialize)]
pub struct DocumentConvertInput { source: String, target: String, content: String }

fn escape_html(value: &str) -> String {
    value.replace('&', "&amp;").replace('<', "&lt;").replace('>', "&gt;").replace('"', "&quot;")
}

fn markdown_to_html(markdown: &str) -> String {
    let options = Options::ENABLE_TABLES | Options::ENABLE_FOOTNOTES | Options::ENABLE_STRIKETHROUGH | Options::ENABLE_TASKLISTS;
    let mut output = String::new();
    html::push_html(&mut output, Parser::new_ext(markdown, options));
    output
}

fn text_to_html(text: &str) -> String {
    text.split("\n\n").map(|paragraph| format!("<p>{}</p>", escape_html(paragraph).replace('\n', "<br>\n"))).collect::<Vec<_>>().join("\n")
}

fn html_to_text(value: &str) -> Result<String, String> {
    let decorator = html2text::render::TrivialDecorator::new();
    html2text::from_read_with_decorator(value.as_bytes(), 120, decorator).map(|text| text.trim_end().to_string()).map_err(|error| error.to_string())
}

fn html_to_markdown(value: &str) -> Result<String, String> {
    let mut output = Vec::new();
    h2md::convert(value.as_bytes(), &mut output).map_err(|error| error.to_string())?;
    String::from_utf8(output).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn convert_document(input: DocumentConvertInput) -> Result<String, String> {
    if input.content.len() > 2 * 1024 * 1024 { return Err("El contenido supera el límite de 2 MB".into()); }
    if input.source == input.target { return Ok(input.content); }
    match (input.source.as_str(), input.target.as_str()) {
        ("markdown", "html") => Ok(markdown_to_html(&input.content)),
        ("markdown", "text") => html_to_text(&markdown_to_html(&input.content)),
        ("html", "text") => html_to_text(&input.content),
        ("text", "html") => Ok(text_to_html(&input.content)),
        ("text", "markdown") => Ok(input.content),
        ("html", "markdown") => html_to_markdown(&input.content),
        _ => Err("Conversión no compatible".into()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn converts_markdown_and_html() {
        let html = markdown_to_html("# Título\n\n**Texto**");
        assert!(html.contains("<h1>Título</h1>")); assert!(html.contains("<strong>Texto</strong>"));
        assert!(html_to_text("<p>Hola <b>mundo</b></p>").unwrap().contains("Hola mundo"));
        assert!(html_to_markdown("<h1>Hola</h1><p><strong>Mundo</strong></p>").unwrap().contains("# Hola"));
    }
}
