mod commands;

use commands::daily_so::{
    preview_daily_so,
    process_daily_so,
};

use commands::express_summary::{
    process_express_summary,
};

use commands::pdf_splitter::{
    split_po_pdf,
};

use commands::po_processor::{
    preview_po_documents,
    process_po_documents,
};

use commands::print_processor::{
    print_po_workbook,
};

use commands::product_catalog::{
    manage_product_catalog,
};

#[tauri::command]
fn greet(
    name: &str,
) -> String {
    format!(
        "Hello, {}! You've been greeted from Rust!",
        name,
    )
}

#[cfg_attr(
    mobile,
    tauri::mobile_entry_point
)]
pub fn run() {
    let builder =
        tauri::Builder::default()
            .plugin(
                tauri_plugin_http::init(),
            )
            .plugin(
                tauri_plugin_opener::init(),
            )
            .plugin(
                tauri_plugin_process::init(),
            )
            .plugin(
                tauri_plugin_dialog::init(),
            );

    #[cfg(desktop)]
    let builder =
        builder.plugin(
            tauri_plugin_updater::
                Builder::new()
                .build(),
        );

    builder
        .invoke_handler(
            tauri::generate_handler![
                greet,
                manage_product_catalog,
                preview_po_documents,
                process_po_documents,
                print_po_workbook,
                split_po_pdf,
                process_express_summary,
                preview_daily_so,
                process_daily_so,
            ],
        )
        .run(
            tauri::generate_context!(),
        )
        .expect(
            "error while running ValuePlus System",
        );
}
