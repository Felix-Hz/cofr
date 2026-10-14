use pyo3::intern;
use pyo3::prelude::*;
use pyo3::types::{PyDict, PyList};

mod export;
mod import;
mod models;

use models::{AccountRow, CategoryRow, TransactionRow};

/// Export transactions to CSV bytes.
/// `rows` is a list of dicts with keys: date, description, amount, currency,
/// category, category_type, account, account_type, is_transfer, transfer_direction, is_opening_balance.
/// Returns CSV bytes.
#[pyfunction]
fn export_csv(rows: Vec<Bound<'_, PyDict>>, _currency: &str) -> PyResult<Vec<u8>> {
    let typed_rows: Vec<TransactionRow> = rows
        .iter()
        .map(|d| TransactionRow::from_pydict(d))
        .collect::<PyResult<Vec<_>>>()?;

    export::csv::write_transactions_csv(&typed_rows)
        .map_err(|e| pyo3::exceptions::PyRuntimeError::new_err(e.to_string()))
}

/// Export transactions to XLSX bytes.
/// For single-scope export, pass rows + empty sheets dict.
/// For full dump, pass sheets dict with keys: "transactions" (list[dict]),
/// "accounts" (list[dict]), "categories" (list[dict]).
#[pyfunction]
fn export_xlsx(
    rows: Vec<Bound<'_, PyDict>>,
    sheets: Bound<'_, PyDict>,
    currency: &str,
) -> PyResult<Vec<u8>> {
    let has_accounts = sheets.contains("accounts")?;
    let has_categories = sheets.contains("categories")?;

    if has_accounts && has_categories {
        // Full dump mode
        let tx_rows: Vec<TransactionRow> = rows
            .iter()
            .map(|d| TransactionRow::from_pydict(d))
            .collect::<PyResult<Vec<_>>>()?;

        let acc_dicts: Vec<Bound<'_, PyDict>> = sheets
            .get_item("accounts")?
            .ok_or_else(|| pyo3::exceptions::PyKeyError::new_err("accounts"))?
            .extract()?;
        let acc_rows: Vec<AccountRow> = acc_dicts
            .iter()
            .map(|d| AccountRow::from_pydict(d))
            .collect::<PyResult<Vec<_>>>()?;

        let cat_dicts: Vec<Bound<'_, PyDict>> = sheets
            .get_item("categories")?
            .ok_or_else(|| pyo3::exceptions::PyKeyError::new_err("categories"))?
            .extract()?;
        let cat_rows: Vec<CategoryRow> = cat_dicts
            .iter()
            .map(|d| CategoryRow::from_pydict(d))
            .collect::<PyResult<Vec<_>>>()?;

        export::xlsx::build_full_dump_xlsx(&tx_rows, &acc_rows, &cat_rows, currency)
            .map_err(|e| pyo3::exceptions::PyRuntimeError::new_err(e.to_string()))
    } else if has_accounts {
        let acc_dicts: Vec<Bound<'_, PyDict>> = sheets
            .get_item("accounts")?
            .ok_or_else(|| pyo3::exceptions::PyKeyError::new_err("accounts"))?
            .extract()?;
        let acc_rows: Vec<AccountRow> = acc_dicts
            .iter()
            .map(|d| AccountRow::from_pydict(d))
            .collect::<PyResult<Vec<_>>>()?;

        export::xlsx::build_accounts_xlsx(&acc_rows)
            .map_err(|e| pyo3::exceptions::PyRuntimeError::new_err(e.to_string()))
    } else if has_categories {
        let cat_dicts: Vec<Bound<'_, PyDict>> = sheets
            .get_item("categories")?
            .ok_or_else(|| pyo3::exceptions::PyKeyError::new_err("categories"))?
            .extract()?;
        let cat_rows: Vec<CategoryRow> = cat_dicts
            .iter()
            .map(|d| CategoryRow::from_pydict(d))
            .collect::<PyResult<Vec<_>>>()?;

        export::xlsx::build_categories_xlsx(&cat_rows)
            .map_err(|e| pyo3::exceptions::PyRuntimeError::new_err(e.to_string()))
    } else {
        // Single transactions sheet
        let typed_rows: Vec<TransactionRow> = rows
            .iter()
            .map(|d| TransactionRow::from_pydict(d))
            .collect::<PyResult<Vec<_>>>()?;

        export::xlsx::build_transactions_xlsx(&typed_rows, currency)
            .map_err(|e| pyo3::exceptions::PyRuntimeError::new_err(e.to_string()))
    }
}

/// Export to PDF bytes.
/// `meta` dict should contain: "title" (str), "currency" (str), "scope" (str).
/// For scope "accounts", rows should be account dicts.
/// For scope "categories", rows should be category dicts.
/// For scope "full_dump", returns error (not supported for PDF).
#[pyfunction]
fn export_pdf(rows: Vec<Bound<'_, PyDict>>, meta: Bound<'_, PyDict>) -> PyResult<Vec<u8>> {
    let title: String = meta
        .get_item("title")?
        .map(|v| {
            v.extract::<String>()
                .unwrap_or_else(|_| "Export".to_string())
        })
        .unwrap_or_else(|| "Export".to_string());
    let currency: String = meta
        .get_item("currency")?
        .map(|v| v.extract::<String>().unwrap_or_else(|_| "NZD".to_string()))
        .unwrap_or_else(|| "NZD".to_string());
    let scope: String = meta
        .get_item("scope")?
        .map(|v| {
            v.extract::<String>()
                .unwrap_or_else(|_| "transactions".to_string())
        })
        .unwrap_or_else(|| "transactions".to_string());

    match scope.as_str() {
        "transactions" => {
            let typed_rows: Vec<TransactionRow> = rows
                .iter()
                .map(|d| TransactionRow::from_pydict(d))
                .collect::<PyResult<Vec<_>>>()?;
            export::pdf::build_transactions_pdf(&typed_rows, &title, &currency)
                .map_err(|e| pyo3::exceptions::PyRuntimeError::new_err(e.to_string()))
        }
        "accounts" => {
            let typed_rows: Vec<AccountRow> = rows
                .iter()
                .map(|d| AccountRow::from_pydict(d))
                .collect::<PyResult<Vec<_>>>()?;
            export::pdf::build_accounts_pdf(&typed_rows, &title)
                .map_err(|e| pyo3::exceptions::PyRuntimeError::new_err(e.to_string()))
        }
        "categories" => {
            let typed_rows: Vec<CategoryRow> = rows
                .iter()
                .map(|d| CategoryRow::from_pydict(d))
                .collect::<PyResult<Vec<_>>>()?;
            export::pdf::build_categories_pdf(&typed_rows, &title)
                .map_err(|e| pyo3::exceptions::PyRuntimeError::new_err(e.to_string()))
        }
        "full_dump" => Err(pyo3::exceptions::PyValueError::new_err(
            "PDF export is not supported for full data dump. Use CSV or XLSX instead.",
        )),
        _ => Err(pyo3::exceptions::PyValueError::new_err(format!(
            "Unknown scope: {scope}"
        ))),
    }
}

/// Export full dump as a ZIP containing CSV files for transactions, accounts, and categories.
#[pyfunction]
fn export_csv_full_dump(
    transactions: Vec<Bound<'_, PyDict>>,
    accounts: Vec<Bound<'_, PyDict>>,
    categories: Vec<Bound<'_, PyDict>>,
) -> PyResult<Vec<u8>> {
    let tx_rows: Vec<TransactionRow> = transactions
        .iter()
        .map(|d| TransactionRow::from_pydict(d))
        .collect::<PyResult<Vec<_>>>()?;
    let acc_rows: Vec<AccountRow> = accounts
        .iter()
        .map(|d| AccountRow::from_pydict(d))
        .collect::<PyResult<Vec<_>>>()?;
    let cat_rows: Vec<CategoryRow> = categories
        .iter()
        .map(|d| CategoryRow::from_pydict(d))
        .collect::<PyResult<Vec<_>>>()?;

    export::csv::write_full_dump_zip(&tx_rows, &acc_rows, &cat_rows)
        .map_err(|e| pyo3::exceptions::PyRuntimeError::new_err(e.to_string()))
}

/// Export accounts to CSV bytes.
#[pyfunction]
fn export_accounts_csv(rows: Vec<Bound<'_, PyDict>>) -> PyResult<Vec<u8>> {
    let typed_rows: Vec<AccountRow> = rows
        .iter()
        .map(|d| AccountRow::from_pydict(d))
        .collect::<PyResult<Vec<_>>>()?;

    export::csv::write_accounts_csv(&typed_rows)
        .map_err(|e| pyo3::exceptions::PyRuntimeError::new_err(e.to_string()))
}

/// Export categories to CSV bytes.
#[pyfunction]
fn export_categories_csv(rows: Vec<Bound<'_, PyDict>>) -> PyResult<Vec<u8>> {
    let typed_rows: Vec<CategoryRow> = rows
        .iter()
        .map(|d| CategoryRow::from_pydict(d))
        .collect::<PyResult<Vec<_>>>()?;

    export::csv::write_categories_csv(&typed_rows)
        .map_err(|e| pyo3::exceptions::PyRuntimeError::new_err(e.to_string()))
}

/// Parse a bank statement CSV into normalized rows.
/// Returns a dict: format, bank, currency_hint, account_ref, rows (list[dict]), errors (list[dict]).
/// Raises ValueError when the file is empty or its format is not recognized.
#[pyfunction]
#[pyo3(signature = (data, filename=None))]
fn parse_bank_csv<'py>(
    py: Python<'py>,
    data: &[u8],
    filename: Option<&str>,
) -> PyResult<Bound<'py, PyDict>> {
    let statement = import::parse_statement(data, filename)
        .map_err(|e| pyo3::exceptions::PyValueError::new_err(e.to_string()))?;

    let rows = PyList::empty(py);
    for row in &statement.rows {
        let d = PyDict::new(py);
        d.set_item(intern!(py, "line"), row.line)?;
        d.set_item(intern!(py, "date"), row.date.to_string())?;
        d.set_item(intern!(py, "amount_cents"), row.amount_cents)?;
        d.set_item(intern!(py, "kind"), &row.kind)?;
        d.set_item(intern!(py, "merchant"), &row.merchant)?;
        d.set_item(intern!(py, "notes"), &row.notes)?;
        d.set_item(intern!(py, "card_last4"), &row.card_last4)?;
        d.set_item(intern!(py, "foreign_amount"), &row.foreign_amount)?;
        d.set_item(
            intern!(py, "conversion_charge_cents"),
            row.conversion_charge_cents,
        )?;
        d.set_item(intern!(py, "fingerprint"), &row.fingerprint)?;
        rows.append(d)?;
    }

    let errors = PyList::empty(py);
    for err in &statement.errors {
        let d = PyDict::new(py);
        d.set_item(intern!(py, "line"), err.line)?;
        d.set_item(intern!(py, "message"), &err.message)?;
        errors.append(d)?;
    }

    let out = PyDict::new(py);
    out.set_item("format", statement.format)?;
    out.set_item("bank", statement.bank)?;
    out.set_item("currency_hint", statement.currency_hint)?;
    out.set_item("account_ref", &statement.account_ref)?;
    out.set_item("rows", rows)?;
    out.set_item("errors", errors)?;
    Ok(out)
}

#[pymodule]
fn scribe(m: &Bound<'_, PyModule>) -> PyResult<()> {
    m.add_function(wrap_pyfunction!(export_csv, m)?)?;
    m.add_function(wrap_pyfunction!(export_xlsx, m)?)?;
    m.add_function(wrap_pyfunction!(export_pdf, m)?)?;
    m.add_function(wrap_pyfunction!(export_csv_full_dump, m)?)?;
    m.add_function(wrap_pyfunction!(export_accounts_csv, m)?)?;
    m.add_function(wrap_pyfunction!(export_categories_csv, m)?)?;
    m.add_function(wrap_pyfunction!(parse_bank_csv, m)?)?;
    Ok(())
}
