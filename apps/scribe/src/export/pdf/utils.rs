use printpdf::*;

// --- Page Dimensions (A4 Landscape) ---
pub const PAGE_W: f32 = 297.0;
pub const PAGE_H: f32 = 210.0;
pub const MARGIN: f32 = 20.0;

// --- Font Sizes ---
pub const SIZE_BRAND: f32 = 18.0;
pub const SIZE_TITLE: f32 = 11.0;
pub const SIZE_HEADER: f32 = 8.5;
pub const SIZE_BODY: f32 = 8.0;
pub const SIZE_SMALL: f32 = 7.0;
pub const SIZE_FOOTER: f32 = 7.0;

// --- Colors ---
pub type Rgb3 = (f32, f32, f32);

// Derived from cofr brand palette (design-palette.md)
// Emerald accent #059669 (print-safe), Navy #0F172A, Slate neutrals
pub const C_BRAND: Rgb3 = (0.02, 0.59, 0.41);
pub const C_TEXT: Rgb3 = (0.06, 0.09, 0.16);
pub const C_SECONDARY: Rgb3 = (0.20, 0.25, 0.33);
pub const C_MUTED: Rgb3 = (0.39, 0.45, 0.55);
pub const C_INCOME: Rgb3 = (0.02, 0.59, 0.41);
pub const C_TRANSFER: Rgb3 = (0.22, 0.40, 0.65);
pub const C_RULE: Rgb3 = (0.82, 0.84, 0.86);

// --- Layout ---
const HEADER_ZONE: f32 = 28.0;
const FOOTER_ZONE: f32 = 12.0;
const COL_HEADER_ZONE: f32 = 8.0;

pub fn content_top() -> f32 {
    PAGE_H - MARGIN - HEADER_ZONE
}

pub fn content_bottom() -> f32 {
    MARGIN + FOOTER_ZONE
}

// --- Page Content ---
// printpdf 0.10 builds each page from a list of drawing operations.
pub type PageOps = Vec<Op>;

// --- Font Bundle ---
pub struct Fonts {
    pub regular: PdfFontHandle,
    pub bold: PdfFontHandle,
}

impl Fonts {
    pub fn builtin() -> Self {
        Self {
            regular: PdfFontHandle::Builtin(BuiltinFont::Helvetica),
            bold: PdfFontHandle::Builtin(BuiltinFont::HelveticaBold),
        }
    }
}

// --- Text Helpers ---
pub fn truncate(text: &str, max: usize) -> String {
    if text.chars().count() <= max {
        return text.to_string();
    }
    if max <= 3 {
        return ".".repeat(max);
    }
    let t: String = text.chars().take(max - 3).collect();
    format!("{t}...")
}

pub fn text(layer: &mut PageOps, font: &PdfFontHandle, x: f32, y: f32, size: f32, s: &str) {
    layer.extend([
        Op::StartTextSection,
        Op::SetTextCursor {
            pos: Point::new(Mm(x), Mm(y)),
        },
        Op::SetFont {
            font: font.clone(),
            size: Pt(size),
        },
        Op::ShowText {
            items: vec![TextItem::Text(s.to_string())],
        },
        Op::EndTextSection,
    ]);
}

fn rgb(c: Rgb3) -> Color {
    Color::Rgb(Rgb::new(c.0, c.1, c.2, None))
}

pub fn set_color(layer: &mut PageOps, c: Rgb3) {
    layer.push(Op::SetFillColor { col: rgb(c) });
}

pub fn colored_text(
    layer: &mut PageOps,
    font: &PdfFontHandle,
    x: f32,
    y: f32,
    size: f32,
    s: &str,
    color: Rgb3,
) {
    set_color(layer, color);
    text(layer, font, x, y, size, s);
}

fn approx_text_width(s: &str, size: f32) -> f32 {
    s.len() as f32 * size * 0.19
}

pub fn right_text(
    layer: &mut PageOps,
    font: &PdfFontHandle,
    right_x: f32,
    y: f32,
    size: f32,
    s: &str,
    color: Rgb3,
) {
    let x = right_x - approx_text_width(s, size);
    colored_text(layer, font, x, y, size, s, color);
}

// --- Line Drawing ---
pub fn rule(layer: &mut PageOps, y: f32, color: Rgb3, thickness: f32) {
    let point = |x: f32| LinePoint {
        p: Point::new(Mm(x), Mm(y)),
        bezier: false,
    };
    layer.extend([
        Op::SetOutlineColor { col: rgb(color) },
        Op::SetOutlineThickness { pt: Pt(thickness) },
        Op::DrawLine {
            line: Line {
                points: vec![point(MARGIN), point(PAGE_W - MARGIN)],
                is_closed: false,
            },
        },
    ]);
}

// --- Page Header ---
pub fn draw_page_header(
    layer: &mut PageOps,
    fonts: &Fonts,
    title: &str,
    subtitle: &str,
    page_num: usize,
    total_pages: usize,
) -> f32 {
    let right = PAGE_W - MARGIN;
    let mut y = PAGE_H - MARGIN;

    // "cofr" wordmark
    colored_text(layer, &fonts.bold, MARGIN, y, SIZE_BRAND, "cofr", C_BRAND);

    // Page indicator
    let page_label = format!("Page {page_num} of {total_pages}");
    right_text(
        layer,
        &fonts.regular,
        right,
        y + 2.0,
        SIZE_FOOTER,
        &page_label,
        C_MUTED,
    );

    y -= 5.0;

    // Accent rule
    rule(layer, y, C_BRAND, 0.6);
    y -= 7.0;

    // Title
    colored_text(layer, &fonts.bold, MARGIN, y, SIZE_TITLE, title, C_TEXT);

    // Subtitle
    if !subtitle.is_empty() {
        right_text(
            layer,
            &fonts.regular,
            right,
            y,
            SIZE_SMALL,
            subtitle,
            C_SECONDARY,
        );
    }

    y -= 10.0;

    y
}

// --- Page Footer ---
pub fn draw_page_footer(layer: &mut PageOps, fonts: &Fonts) {
    let y = MARGIN + 2.0;

    rule(layer, y + 4.0, C_RULE, 0.3);
    colored_text(
        layer,
        &fonts.regular,
        MARGIN,
        y,
        SIZE_FOOTER,
        "cofr.cash",
        C_MUTED,
    );

    let date = chrono::Utc::now().format("%Y-%m-%d").to_string();
    let label = format!("Exported {date}");
    right_text(
        layer,
        &fonts.regular,
        PAGE_W - MARGIN,
        y,
        SIZE_FOOTER,
        &label,
        C_MUTED,
    );
}

// --- Document Assembly ---
pub fn finish_page(layer: &mut PageOps) -> PdfPage {
    PdfPage::new(Mm(PAGE_W), Mm(PAGE_H), std::mem::take(layer))
}

pub fn save(title: &str, pages: Vec<PdfPage>) -> Vec<u8> {
    let mut warnings = Vec::new();
    PdfDocument::new(title)
        .with_pages(pages)
        .save(&PdfSaveOptions::default(), &mut warnings)
}

// --- Pagination ---
pub fn rows_per_page(row_height: f32) -> usize {
    let data_height = content_top() - content_bottom() - COL_HEADER_ZONE;
    (data_height / row_height) as usize
}

pub fn total_pages(row_count: usize, rpp: usize) -> usize {
    if row_count == 0 {
        1
    } else {
        row_count.div_ceil(rpp)
    }
}
