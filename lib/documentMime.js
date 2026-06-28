/** Shared MIME normalization for submission file parsers (client + server). */
export function normalizeDocumentMime(file) {
    const ext = file.fileName.split('.').pop()?.toLowerCase();
    const mime = file.fileType?.toLowerCase() || '';
    if (!mime || mime === 'application/octet-stream') {
        const extMap = {
            pdf: 'application/pdf',
            docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            doc: 'application/msword',
            txt: 'text/plain',
            csv: 'text/csv',
            md: 'text/markdown',
            json: 'application/json',
        };
        return ext ? extMap[ext] || '' : '';
    }
    return mime;
}
