from pathlib import Path

from jinja2 import Environment, FileSystemLoader

_template_dir = Path(__file__).parent / "templates"
_env = Environment(loader=FileSystemLoader(str(_template_dir)), autoescape=True)


def render_template(template_name: str, **context: object) -> str:
    """Render an email template by name (without .html extension)."""
    template = _env.get_template(f"{template_name}.html")
    return template.render(**context)
