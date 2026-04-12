from html import escape
from typing import Literal

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import HTMLResponse

from app.config import settings
from app.email.templates import render_template

router = APIRouter(prefix="/dev/email-preview", tags=["Dev Email Preview"])

_ALLOWED_ENVS = {"local", "development", "dev", "test"}
_TemplateName = Literal["verification", "welcome", "password_reset"]
_SAMPLE_PERSON = "alice"


def _ensure_preview_enabled() -> None:
    if settings.ENV.lower() not in _ALLOWED_ENVS:
        raise HTTPException(status_code=404, detail="Not found")


def _render_email(template_name: _TemplateName) -> str:
    if template_name == "verification":
        verify_url = f"{settings.FRONTEND_URL}/verify-email?token=preview-{_SAMPLE_PERSON}-token"
        return render_template("verification", verify_url=verify_url)

    if template_name == "password_reset":
        reset_url = f"{settings.FRONTEND_URL}/reset-password?token=preview-{_SAMPLE_PERSON}-token"
        return render_template("password_reset", reset_url=reset_url)

    return render_template("welcome", name="Alice")


@router.get("", response_class=HTMLResponse)
async def email_preview(
    template: _TemplateName = Query(default="verification"),
) -> HTMLResponse:
    """Single-route local gallery for rendered email templates."""
    _ensure_preview_enabled()

    selected_html = _render_email(template)
    preview_srcdoc = escape(selected_html, quote=True)

    def preview_link(label: str, template_name: _TemplateName):
        is_active = template == template_name
        href = f"/dev/email-preview?template={template_name}"
        class_name = "preview-link active" if is_active else "preview-link"
        return (
            f'<a href="{href}" class="{class_name}">'
            f"<strong>{label}</strong>"
            f"<small>Sample data: Alice</small>"
            f"</a>"
        )

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>cofr email preview</title>
  <style>
    * {{
      box-sizing: border-box;
    }}
    body {{
      margin: 0;
      font-family: "Manrope", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: #f6f8fa;
      color: #4b5563;
    }}
    .page {{
      min-height: 100vh;
      padding: 28px 18px;
    }}
    .wrap {{
      max-width: 1320px;
      margin: 0 auto;
      display: grid;
      grid-template-columns: 320px minmax(0, 1fr);
      gap: 22px;
      align-items: start;
    }}
    .panel {{
      border: 1px solid #e5e7eb;
      border-radius: 24px;
      background: #ffffff;
      box-shadow: 0 18px 45px rgba(15, 23, 42, 0.06);
    }}
    .sidebar {{
      padding: 26px;
      position: sticky;
      top: 20px;
    }}
    .eyebrow {{
      margin: 0 0 10px;
      font-size: 11px;
      line-height: 1;
      font-weight: 800;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: #10b981;
    }}
    h1 {{
      margin: 0 0 10px;
      font-size: 2.2rem;
      line-height: 1.02;
      letter-spacing: -0.05em;
      color: #0f172a;
    }}
    p {{
      margin: 0 0 14px;
      font-size: 14px;
      line-height: 1.7;
    }}
    .list {{
      display: grid;
      gap: 10px;
      margin-top: 18px;
    }}
    .preview-link {{
      display: block;
      padding: 16px 16px 15px;
      border: 1px solid #e5e7eb;
      border-radius: 18px;
      background: #ffffff;
      color: #0f172a;
      text-decoration: none;
      transition: border-color 140ms ease, transform 140ms ease, box-shadow 140ms ease;
    }}
    .preview-link:hover {{
      border-color: #cbd5e1;
      transform: translateY(-1px);
      box-shadow: 0 12px 28px rgba(15, 23, 42, 0.08);
    }}
    .preview-link.active {{
      border-color: #10b981;
      box-shadow: inset 0 0 0 1px #10b981;
    }}
    .preview-link strong {{
      display: block;
      font-size: 15px;
      line-height: 1.3;
    }}
    .preview-link small {{
      display: block;
      margin-top: 6px;
      font-size: 12px;
      line-height: 1.5;
      color: #6b7280;
    }}
    .viewer {{
      overflow: hidden;
      background: #ffffff;
    }}
    .viewer-head {{
      display: flex;
      justify-content: space-between;
      gap: 16px;
      align-items: center;
      padding: 18px 22px;
      border-bottom: 1px solid #e5e7eb;
    }}
    .viewer-head h2 {{
      margin: 0;
      font-size: 16px;
      line-height: 1.2;
      color: #0f172a;
    }}
    .viewer-head span {{
      font-size: 12px;
      color: #6b7280;
    }}
    iframe {{
      display: block;
      width: 100%;
      height: 0;
      border: 0;
      background: #ffffff;
    }}
    code {{
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 12px;
      color: #059669;
    }}
    @media (max-width: 980px) {{
      .wrap {{
        grid-template-columns: 1fr;
      }}
      .sidebar {{
        position: static;
      }}
    }}
  </style>
</head>
<body>
  <div class="page">
    <div class="wrap">
      <aside class="panel sidebar">
        <p class="eyebrow">cofr mail</p>
        <h1>Email preview</h1>
        <p>This page imports the same Jinja templates the email sender uses.</p>
        <p>Current selection: <code>{template}</code> with fixed <code>Alice</code> sample data.</p>
        <div class="list">
          {preview_link("Verification email", "verification")}
          {preview_link("Welcome email", "welcome")}
          {preview_link("Password reset email", "password_reset")}
        </div>
      </aside>
      <section class="panel viewer">
        <div class="viewer-head">
          <h2>{template} preview</h2>
          <span>Rendered from <code>app.email.templates.render_template</code></span>
        </div>
        <iframe title="cofr email preview" srcdoc="{preview_srcdoc}"></iframe>
      </section>
    </div>
  </div>
  <script>
    const iframe = document.querySelector('iframe[title="cofr email preview"]');

    function resizeIframe() {{
      if (!iframe) {{
        return;
      }}

      const doc = iframe.contentDocument;
      if (!doc) {{
        return;
      }}

      const root = doc.documentElement;
      const body = doc.body;
      const height = Math.max(
        root ? root.scrollHeight : 0,
        root ? root.offsetHeight : 0,
        body ? body.scrollHeight : 0,
        body ? body.offsetHeight : 0
      );

      iframe.style.height = `${{Math.max(420, height)}}px`;
    }}

    if (iframe) {{
      iframe.addEventListener("load", function () {{
        resizeIframe();
        setTimeout(resizeIframe, 0);
      }});
    }}
  </script>
</body>
</html>"""
    return HTMLResponse(content=html)
