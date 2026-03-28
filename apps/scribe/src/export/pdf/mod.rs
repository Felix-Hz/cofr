use printpdf::*;

use crate::models::{AccountRow, CategoryRow, TransactionRow, ACCOUNT_HEADERS, CATEGORY_HEADERS};

const PAGE_WIDTH: f32 = 297.0;
const PAGE_HEIGHT: f32 = 210.0;
const MARGIN: f32 = 15.0;
const LINE_HEIGHT: f32 = 5.0;
const HEADER_FONT_SIZE: f32 = 10.0;
const BODY_FONT_SIZE: f32 = 8.0;
const TITLE_FONT_SIZE: f32 = 14.0;
const TX_ROW_HEIGHT: f32 = 12.0;
const TX_DESCRIPTION_X: f32 = 52.0;
const TX_AMOUNT_X: f32 = 235.0;

struct TransactionPageHeader<'a> {
    title: &'a str,
    currency: &'a str,
    rows_len: usize,
    page_num: usize,
    total_pages: usize,
}

fn usable_height() -> f32 {
    PAGE_HEIGHT - 2.0 * MARGIN
}

fn transaction_rows_per_page() -> usize {
    let available = usable_height() - 34.0;
    (available / TX_ROW_HEIGHT) as usize
}

fn draw_text(
    layer: &PdfLayerReference,
    font: &IndirectFontRef,
    x: f32,
    y: f32,
    size: f32,
    text: &str,
) {
    layer.use_text(text, size, Mm(x), Mm(y), font);
}

fn truncate_text(text: &str, max_chars: usize) -> String {
    if text.chars().count() <= max_chars {
        return text.to_string();
    }

    if max_chars <= 3 {
        return ".".repeat(max_chars);
    }

    let truncated: String = text.chars().take(max_chars - 3).collect();
    format!("{}...", truncated)
}

fn transaction_metadata_line(row: &TransactionRow) -> String {
    let category = if row.category.is_empty() {
        "Uncategorized".to_string()
    } else if row.category_type.is_empty() {
        row.category.clone()
    } else {
        format!("{} ({})", row.category, row.category_type)
    };

    let account = if row.account.is_empty() {
        "No account".to_string()
    } else if row.account_type.is_empty() {
        row.account.clone()
    } else {
        format!("{} ({})", row.account, row.account_type)
    };

    let mut parts = vec![category, account];

    if row.is_transfer {
        let transfer = if row.transfer_direction.is_empty() {
            "Transfer".to_string()
        } else {
            format!("Transfer: {}", row.transfer_direction)
        };
        parts.push(transfer);
    }

    if row.is_opening_balance {
        parts.push("Opening balance".to_string());
    }

    parts.join(" | ")
}

fn draw_transaction_page_header(
    layer: &PdfLayerReference,
    font: &IndirectFontRef,
    font_bold: &IndirectFontRef,
    header: &TransactionPageHeader<'_>,
) -> f32 {
    let mut y = PAGE_HEIGHT - MARGIN;

    draw_text(layer, font_bold, MARGIN, y, TITLE_FONT_SIZE, header.title);
    let page_label = format!("Page {} of {}", header.page_num, header.total_pages);
    draw_text(
        layer,
        font,
        PAGE_WIDTH - 42.0,
        y,
        BODY_FONT_SIZE,
        &page_label,
    );
    y -= TITLE_FONT_SIZE + 4.0;

    let subtitle = format!(
        "{} transactions | Currency: {}",
        header.rows_len, header.currency
    );
    draw_text(layer, font, MARGIN, y, BODY_FONT_SIZE, &subtitle);
    y -= 8.0;

    draw_text(layer, font_bold, MARGIN, y, HEADER_FONT_SIZE, "Date");
    draw_text(
        layer,
        font_bold,
        TX_DESCRIPTION_X,
        y,
        HEADER_FONT_SIZE,
        "Description",
    );
    draw_text(layer, font_bold, TX_AMOUNT_X, y, HEADER_FONT_SIZE, "Amount");
    y -= 6.0;

    y
}

pub fn build_transactions_pdf(
    rows: &[TransactionRow],
    title: &str,
    currency: &str,
) -> Result<Vec<u8>, Box<dyn std::error::Error>> {
    let (doc, page1, layer1) = PdfDocument::new(title, Mm(PAGE_WIDTH), Mm(PAGE_HEIGHT), "Layer 1");

    let font = doc.add_builtin_font(BuiltinFont::Helvetica)?;
    let font_bold = doc.add_builtin_font(BuiltinFont::HelveticaBold)?;

    let rpp = transaction_rows_per_page();
    let mut current_layer = doc.get_page(page1).get_layer(layer1);
    let mut y;
    let mut rows_on_page = 0;
    let mut page_num = 1;
    let total_pages = if rows.is_empty() {
        1
    } else {
        rows.len().div_ceil(rpp)
    };
    let mut header = TransactionPageHeader {
        title,
        currency,
        rows_len: rows.len(),
        page_num,
        total_pages,
    };

    y = draw_transaction_page_header(&current_layer, &font, &font_bold, &header);

    for row in rows {
        if rows_on_page >= rpp {
            page_num += 1;
            let (new_page, new_layer) = doc.add_page(Mm(PAGE_WIDTH), Mm(PAGE_HEIGHT), "Layer 1");
            current_layer = doc.get_page(new_page).get_layer(new_layer);
            rows_on_page = 0;
            header.page_num = page_num;
            y = draw_transaction_page_header(&current_layer, &font, &font_bold, &header);
        }

        let description = if row.description.trim().is_empty() {
            "No description"
        } else {
            row.description.trim()
        };
        let primary_date = truncate_text(&row.date, 16);
        let primary_description = truncate_text(description, 42);
        let primary_amount = truncate_text(&format!("{:.2} {}", row.amount, row.currency), 18);
        let secondary_line = truncate_text(&transaction_metadata_line(row), 90);

        draw_text(
            &current_layer,
            &font,
            MARGIN,
            y,
            BODY_FONT_SIZE,
            &primary_date,
        );
        draw_text(
            &current_layer,
            &font_bold,
            TX_DESCRIPTION_X,
            y,
            BODY_FONT_SIZE,
            &primary_description,
        );
        draw_text(
            &current_layer,
            &font_bold,
            TX_AMOUNT_X,
            y,
            BODY_FONT_SIZE,
            &primary_amount,
        );
        draw_text(
            &current_layer,
            &font,
            TX_DESCRIPTION_X,
            y - 4.6,
            7.0,
            &secondary_line,
        );

        y -= TX_ROW_HEIGHT;
        rows_on_page += 1;
    }

    let bytes = doc.save_to_bytes()?;
    Ok(bytes)
}

pub fn build_accounts_pdf(
    rows: &[AccountRow],
    title: &str,
) -> Result<Vec<u8>, Box<dyn std::error::Error>> {
    let (doc, page1, layer1) = PdfDocument::new(title, Mm(PAGE_WIDTH), Mm(PAGE_HEIGHT), "Layer 1");

    let font = doc.add_builtin_font(BuiltinFont::Helvetica)?;
    let font_bold = doc.add_builtin_font(BuiltinFont::HelveticaBold)?;
    let current_layer = doc.get_page(page1).get_layer(layer1);
    let mut y = PAGE_HEIGHT - MARGIN;

    draw_text(
        &current_layer,
        &font_bold,
        MARGIN,
        y,
        TITLE_FONT_SIZE,
        title,
    );
    y -= TITLE_FONT_SIZE + LINE_HEIGHT;

    let col_widths = [60.0, 40.0, 40.0];
    let mut x = MARGIN;
    for (i, header) in ACCOUNT_HEADERS.iter().enumerate() {
        draw_text(&current_layer, &font_bold, x, y, HEADER_FONT_SIZE, header);
        x += col_widths[i];
    }
    y -= LINE_HEIGHT * 1.5;

    for row in rows {
        let fields = row.to_csv_record();
        x = MARGIN;
        for (i, field) in fields.iter().enumerate() {
            draw_text(&current_layer, &font, x, y, BODY_FONT_SIZE, field);
            x += col_widths.get(i).copied().unwrap_or(40.0);
        }
        y -= LINE_HEIGHT;
    }

    Ok(doc.save_to_bytes()?)
}

pub fn build_categories_pdf(
    rows: &[CategoryRow],
    title: &str,
) -> Result<Vec<u8>, Box<dyn std::error::Error>> {
    let (doc, page1, layer1) = PdfDocument::new(title, Mm(PAGE_WIDTH), Mm(PAGE_HEIGHT), "Layer 1");

    let font = doc.add_builtin_font(BuiltinFont::Helvetica)?;
    let font_bold = doc.add_builtin_font(BuiltinFont::HelveticaBold)?;
    let current_layer = doc.get_page(page1).get_layer(layer1);
    let mut y = PAGE_HEIGHT - MARGIN;

    draw_text(
        &current_layer,
        &font_bold,
        MARGIN,
        y,
        TITLE_FONT_SIZE,
        title,
    );
    y -= TITLE_FONT_SIZE + LINE_HEIGHT;

    let col_widths = [60.0, 40.0, 40.0, 40.0];
    let mut x = MARGIN;
    for (i, header) in CATEGORY_HEADERS.iter().enumerate() {
        draw_text(&current_layer, &font_bold, x, y, HEADER_FONT_SIZE, header);
        x += col_widths[i];
    }
    y -= LINE_HEIGHT * 1.5;

    for row in rows {
        let fields = row.to_csv_record();
        x = MARGIN;
        for (i, field) in fields.iter().enumerate() {
            draw_text(&current_layer, &font, x, y, BODY_FONT_SIZE, field);
            x += col_widths.get(i).copied().unwrap_or(40.0);
        }
        y -= LINE_HEIGHT;
    }

    Ok(doc.save_to_bytes()?)
}

#[cfg(test)]
mod tests;
