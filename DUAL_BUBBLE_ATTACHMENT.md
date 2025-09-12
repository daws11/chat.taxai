# Dual Bubble Attachment System

## Konsep
Ketika user mengirim pesan dengan attachment, sistem akan membuat 2 bubble terpisah:
1. **Bubble Pertama**: Menampilkan nama file attachment dengan ikon 📎
2. **Bubble Kedua**: Menampilkan pesan teks yang dikirim user

## Implementasi

### 1. **Frontend (useAssistant Hook)**
```typescript
// Jika ada files, buat 2 bubble terpisah
if (files && files.length > 0) {
  // Bubble 1: File attachment names
  const attachmentMessage: ThreadMessage = {
    role: 'user',
    content: `📎 ${attachmentNames}`,
    attachments: files.map(file => ({...}))
  };
  
  // Bubble 2: User text message (jika ada)
  if (message.trim()) {
    const textMessage: ThreadMessage = {
      role: 'user',
      content: message
    };
  }
}
```

### 2. **UI Components**
- **ChatMessage**: Menampilkan attachments di atas bubble content
- **AttachmentDisplay**: Styling khusus dengan warna biru untuk membedakan dari bubble biasa

### 3. **Response Handling**
- Mencari user message yang memiliki attachments (bubble pertama)
- Update attachments dari API response ke bubble yang tepat

## Visual Flow

```
User mengirim: "analisa file berikut" + file.docx
↓
Frontend membuat:
┌─────────────────┐
│ 📎 file.docx    │ ← Bubble 1 (attachment)
└─────────────────┘
┌─────────────────┐
│ analisa file    │ ← Bubble 2 (text)
│ berikut         │
└─────────────────┘
┌─────────────────┐
│ Assistant       │ ← Assistant response
│ response...     │
└─────────────────┘
```

## Keuntungan
1. **Clarity**: User jelas melihat file yang diupload
2. **Separation**: File dan text terpisah, mudah dibedakan
3. **Consistency**: Pattern yang konsisten untuk semua attachment
4. **Visual**: Ikon 📎 membuat attachment mudah dikenali

## Testing
1. Upload file dengan pesan teks → Harus ada 2 bubble
2. Upload file tanpa pesan teks → Hanya 1 bubble (attachment)
3. Kirim pesan tanpa file → 1 bubble normal
4. Multiple files → Nama file dipisah koma di bubble pertama
