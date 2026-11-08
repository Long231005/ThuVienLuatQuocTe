export const AI_IMPORT_PROMPT = `Bạn là trợ lý chuyên về luật quốc tế. Hãy đọc tài liệu mà tôi gửi ở cuối tin nhắn này và chuyển nội dung thành MỘT khối JSON duy nhất theo đúng cấu trúc bên dưới, để tôi nhập vào thư viện luật của nhóm.

YÊU CẦU ĐẦU RA
- Chỉ trả về một khối code JSON hợp lệ (mở bằng \`\`\`json và đóng bằng \`\`\`). Không giải thích, không viết thêm chữ nào ngoài khối code.
- Viết bằng tiếng Việt có dấu. Tên riêng và thuật ngữ gốc (Latin, Anh) có thể giữ nguyên.
- Trong chuỗi văn bản, xuống dòng bằng \\n. Không dùng dấu ngoặc kép " bên trong nội dung (dùng dấu nháy đơn ' hoặc dấu ngoặc « »).
- Không bịa. Thông tin không có trong tài liệu mà bạn không chắc chắn thì ghi "Chưa có thông tin" hoặc bỏ bài đó.
- "sources": chỉ ghi đường link chính thức mà bạn chắc chắn tồn tại (ví dụ un.org, legal.un.org, icj-cij.org, pca-cpa.org, itlos.org). Không chắc chắn thì để mảng rỗng [].
- Mỗi bài phải đủ các trường bắt buộc. Nếu tài liệu không có điều ước thì "treaties": []; không có án lệ thì "cases": [].

PHÂN LOẠI
- "treaties": điều ước quốc tế, tập quán quốc tế, nguyên tắc pháp lý chung. Trường "category" CHỈ được là một trong ba giá trị chính xác: "Điều ước quốc tế", "Tập quán quốc tế", "Nguyên tắc pháp lý chung".
- "cases": án lệ, tóm tắt theo khung IRAC: facts (sự kiện), issues (vấn đề pháp lý, đánh số 1. 2. 3.), holding (lập luận của Tòa và phán quyết), significance (ý nghĩa pháp lý). "year" là số nguyên (năm phán quyết). "court" ví dụ: ICJ, PCA, ITLOS, PCIJ.

CẤU TRÚC
\`\`\`json
{
  "schema_version": "1.0",
  "treaties": [
    {
      "name": "Tên văn kiện hoặc nguyên tắc",
      "category": "Điều ước quốc tế",
      "date": "Ngày ký, ngày hiệu lực hoặc thời kỳ hình thành",
      "content": "Nội dung cốt lõi, các ý cách nhau bằng \\n",
      "tags": ["từ khóa 1", "từ khóa 2"],
      "sources": [{ "title": "Tên nguồn", "url": "https://..." }]
    }
  ],
  "cases": [
    {
      "name": "Tên vụ việc (bên kiện kiện bên bị kiện)",
      "court": "ICJ",
      "year": 1949,
      "facts": "Tóm tắt sự kiện",
      "issues": "1. Vấn đề thứ nhất\\n2. Vấn đề thứ hai",
      "holding": "Lập luận của Tòa và phán quyết",
      "significance": "Ý nghĩa pháp lý",
      "tags": ["từ khóa"],
      "sources": [{ "title": "Tên nguồn", "url": "https://..." }]
    }
  ]
}
\`\`\`

TÀI LIỆU CỦA TÔI (nội dung bắt đầu từ dòng dưới):`;
