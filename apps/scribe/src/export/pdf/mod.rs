mod utils;

use printpdf::*;

use crate::models::{AccountRow, CategoryRow, TransactionRow, ACCOUNT_HEADERS, CATEGORY_HEADERS};
use utils::*;

// --- Transaction Layout ---
const TX_ROW_HEIGHT: f32 = 11.0;
const TX_DATE_X: f32 = MARGIN;
const TX_DESC_X: f32 = 50.0;
const TX_AMOUNT_X: f32 = 232.0;

// --- Table Layout ---
const TABLE_ROW_HEIGHT: f32 = 5.5;
const TABLE_HEADER_GAP: f32 = 3.0;

// --- Transaction Helpers ---

fn transaction_metadata(row: &TransactionRow) -> String {
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
        let dir = if row.transfer_direction.is_empty() {
            "Transfer".to_string()
        } else {
            format!("Transfer: {}", row.transfer_direction)
        };
        parts.push(dir);
    }

    if row.is_opening_balance {
        parts.push("Opening balance".to_string());
    }

    parts.join(" | ")
}

fn amount_color(row: &TransactionRow) -> Rgb3 {
    if row.is_transfer {
        C_TRANSFER
    } else if row.category_type == "income" {
        C_INCOME
    } else {
        C_TEXT
    }
}

fn draw_tx_column_headers(layer: &PdfLayerReference, fonts: &Fonts, y: f32) {
    colored_text(
        layer,
        &fonts.bold,
        TX_DATE_X,
        y,
        SIZE_HEADER,
        "Date",
        C_SECONDARY,
    );
    colored_text(
        layer,
        &fonts.bold,
        TX_DESC_X,
        y,
        SIZE_HEADER,
        "Description",
        C_SECONDARY,
    );
    colored_text(
        layer,
        &fonts.bold,
        TX_AMOUNT_X,
        y,
        SIZE_HEADER,
        "Amount",
        C_SECONDARY,
    );
    rule(layer, y - 2.0, C_RULE, 0.3);
}

// --- Transactions PDF ---

pub fn build_transactions_pdf(
    rows: &[TransactionRow],
    title: &str,
    currency: &str,
) -> Result<Vec<u8>, Box<dyn std::error::Error>> {
    let rpp = rows_per_page(TX_ROW_HEIGHT);
    let pages = total_pages(rows.len(), rpp);
    let subtitle = format!("{} transactions | {}", rows.len(), currency);

    let (doc, page1, layer1) = PdfDocument::new(title, Mm(PAGE_W), Mm(PAGE_H), "Layer 1");
    let fonts = Fonts::load(&doc)?;

    let mut current_layer = doc.get_page(page1).get_layer(layer1);
    let mut y = draw_page_header(&current_layer, &fonts, title, &subtitle, 1, pages);
    draw_tx_column_headers(&current_layer, &fonts, y);
    y -= 5.0;

    let mut rows_on_page = 0;
    let mut page_num = 1;

    for row in rows {
        if rows_on_page >= rpp {
            draw_page_footer(&current_layer, &fonts);
            page_num += 1;
            let (new_page, new_layer) = doc.add_page(Mm(PAGE_W), Mm(PAGE_H), "Layer 1");
            current_layer = doc.get_page(new_page).get_layer(new_layer);
            y = draw_page_header(&current_layer, &fonts, title, &subtitle, page_num, pages);
            draw_tx_column_headers(&current_layer, &fonts, y);
            y -= 5.0;
            rows_on_page = 0;
        }

        let date_str = truncate(&row.date, 16);
        let desc = if row.description.trim().is_empty() {
            "No description"
        } else {
            row.description.trim()
        };
        let desc_str = truncate(desc, 44);
        let amt_str = truncate(&format!("{:.2} {}", row.amount, row.currency), 20);
        let meta = truncate(&transaction_metadata(row), 95);

        colored_text(
            &current_layer,
            &fonts.regular,
            TX_DATE_X,
            y,
            SIZE_BODY,
            &date_str,
            C_SECONDARY,
        );
        colored_text(
            &current_layer,
            &fonts.bold,
            TX_DESC_X,
            y,
            SIZE_BODY,
            &desc_str,
            C_TEXT,
        );
        colored_text(
            &current_layer,
            &fonts.bold,
            TX_AMOUNT_X,
            y,
            SIZE_BODY,
            &amt_str,
            amount_color(row),
        );
        colored_text(
            &current_layer,
            &fonts.regular,
            TX_DESC_X,
            y - 4.2,
            SIZE_SMALL,
            &meta,
            C_MUTED,
        );

        y -= TX_ROW_HEIGHT;
        rows_on_page += 1;
    }

    draw_page_footer(&current_layer, &fonts);

    Ok(doc.save_to_bytes()?)
}

// --- Generic Table PDF (Accounts / Categories) ---

fn draw_table_column_headers(
    layer: &PdfLayerReference,
    fonts: &Fonts,
    headers: &[&str],
    col_widths: &[f32],
    y: f32,
) {
    let mut x = MARGIN;
    for (i, header) in headers.iter().enumerate() {
        colored_text(layer, &fonts.bold, x, y, SIZE_HEADER, header, C_SECONDARY);
        x += col_widths.get(i).copied().unwrap_or(40.0);
    }
    rule(layer, y - 2.0, C_RULE, 0.3);
}

fn build_table_pdf(
    title: &str,
    subtitle: &str,
    headers: &[&str],
    col_widths: &[f32],
    rows: &[Vec<String>],
) -> Result<Vec<u8>, Box<dyn std::error::Error>> {
    let rpp = rows_per_page(TABLE_ROW_HEIGHT);
    let pages = total_pages(rows.len(), rpp);

    let (doc, page1, layer1) = PdfDocument::new(title, Mm(PAGE_W), Mm(PAGE_H), "Layer 1");
    let fonts = Fonts::load(&doc)?;

    let mut current_layer = doc.get_page(page1).get_layer(layer1);
    let mut y = draw_page_header(&current_layer, &fonts, title, subtitle, 1, pages);
    draw_table_column_headers(&current_layer, &fonts, headers, col_widths, y);
    y -= TABLE_HEADER_GAP + TABLE_ROW_HEIGHT;

    let mut rows_on_page = 0;
    let mut page_num = 1;

    for row_data in rows {
        if rows_on_page >= rpp {
            draw_page_footer(&current_layer, &fonts);
            page_num += 1;
            let (new_page, new_layer) = doc.add_page(Mm(PAGE_W), Mm(PAGE_H), "Layer 1");
            current_layer = doc.get_page(new_page).get_layer(new_layer);
            y = draw_page_header(&current_layer, &fonts, title, subtitle, page_num, pages);
            draw_table_column_headers(&current_layer, &fonts, headers, col_widths, y);
            y -= TABLE_HEADER_GAP + TABLE_ROW_HEIGHT;
            rows_on_page = 0;
        }

        let mut x = MARGIN;
        for (i, field) in row_data.iter().enumerate() {
            colored_text(
                &current_layer,
                &fonts.regular,
                x,
                y,
                SIZE_BODY,
                field,
                C_TEXT,
            );
            x += col_widths.get(i).copied().unwrap_or(40.0);
        }

        y -= TABLE_ROW_HEIGHT;
        rows_on_page += 1;
    }

    draw_page_footer(&current_layer, &fonts);

    Ok(doc.save_to_bytes()?)
}

// --- Accounts PDF ---

pub fn build_accounts_pdf(
    rows: &[AccountRow],
    title: &str,
) -> Result<Vec<u8>, Box<dyn std::error::Error>> {
    let subtitle = format!("{} accounts", rows.len());
    let col_widths = [65.0, 45.0, 45.0];
    let data: Vec<Vec<String>> = rows.iter().map(|r| r.to_csv_record()).collect();
    build_table_pdf(title, &subtitle, ACCOUNT_HEADERS, &col_widths, &data)
}

// --- Categories PDF ---

pub fn build_categories_pdf(
    rows: &[CategoryRow],
    title: &str,
) -> Result<Vec<u8>, Box<dyn std::error::Error>> {
    let subtitle = format!("{} categories", rows.len());
    let col_widths = [65.0, 45.0, 45.0, 50.0];
    let data: Vec<Vec<String>> = rows.iter().map(|r| r.to_csv_record()).collect();
    build_table_pdf(title, &subtitle, CATEGORY_HEADERS, &col_widths, &data)
}

#[cfg(test)]
mod tests;
