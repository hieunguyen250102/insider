# Nội Gián — Insider online 🕵️

Bản chơi online **thời gian thực** của board game
[Insider](https://oinkgames.com/en/games/analog/insider/) (Oink Games), tiếng Việt, 4 đến 8 người,
đủ luật theo `Insider_Condensed_Rules.pdf`.

- **Realtime** qua WebSocket (Socket.IO) — vào bàn bằng mã 4 ký tự.
- **Đăng nhập bằng mã email** (dùng chung `oink-kit` với Deep Sea, Scout…): nhập email → nhận mã 6 số.
  Chỉ các email trong `HOST_EMAILS` được **mở bàn**; người khác vào bàn bằng mã.
- **Chat trong bàn** ở phòng chờ và suốt ván; tin nhắn hiện thành bong bóng dưới nhân vật.
- **Máy chủ là trọng tài**: từ khóa và danh tính Nội gián chỉ nằm trên server. Mỗi người chỉ nhận
  phần bí mật của mình (Quản trò và Nội gián thấy từ khóa, Thường dân không) — xem trộm DevTools cũng vô ích.
- **Hỏi – đáp có cấu trúc**: hỏi câu Có/Không hoặc đoán thẳng từ khóa. Đoán có dấu hay không dấu,
  “con mèo” hay “mèo”, “có phải là… không?” đều được hiểu; từ đồng nghĩa thì Quản trò bấm **Đúng rồi!**.
  Quản trò trả lời bằng nút hoặc phím 1–4, có thể sửa con dấu.
- **Bot** để chơi thử khi thiếu người: bot hỏi theo bộ câu hỏi có sẵn, lọc từ khóa theo câu trả lời,
  đoán, tán gẫu lúc thảo luận và bỏ phiếu. Bot không làm Quản trò (không trả lời được câu hỏi tự do).
- **Vào lại được**: F5 hay rớt mạng vẫn quay về đúng ghế, đúng vai. Người mới vào giữa hai ván.
- **Hình vẽ lại bằng SVG** theo phong cách in lụa của bộ thẻ tự làm (giấy kem, đỏ son, than chì):
  8 nhân vật thám tử, thẻ vai, thẻ từ khóa, đồng hồ cát. Không neon, không phát sáng.
- **Hoạt ảnh**: lật thẻ vai 3D, màn “nhắm mắt” có mí mắt khép/mở, thẻ từ khóa trượt vào và tô dạ quang dòng
  được chọn, cát chảy thật theo đồng hồ server và **lật ngược** khi có người đoán trúng, con dấu CÓ/KHÔNG
  đập xuống, đồng hồ run khi sắp hết giờ, bảng “Đúng rồi!”, giơ tay biểu quyết, chỉ tay kèm đếm phiếu,
  lật vai từng người ở cuối ván, pháo giấy cho phe thắng. Âm thanh tổng hợp bằng WebAudio (tắt được).
- Chạy tốt từ điện thoại tới desktop.

---

## Cấu trúc

```
insider/
├── shared/              # Luật thuần tuý (dùng chung server + client)
│   ├── types.ts         # kiểu dữ liệu gửi qua socket
│   ├── engine.ts        # chia vai, rút từ khóa, so khớp câu đoán, kiểm phiếu
│   ├── timing.ts        # thời lượng từng pha (màn nhắm mắt, biểu quyết…)
│   └── words.ts         # 42 thẻ × 6 từ — đúng bộ thẻ in trong images/
├── server/              # Express + Socket.IO — trọng tài
│   ├── src/room.ts      # một bàn: máy trạng thái của cả ván, bot, chat
│   ├── src/bot.ts       # bot: hỏi, suy luận, đoán, bỏ phiếu
│   ├── src/knowledge.ts # bot biết gì về 252 từ khóa
│   ├── src/auth.ts      # đăng nhập mã email (oink-kit)
│   ├── src/index.ts     # socket + HTTP + đồng hồ chung
│   └── test/sim.ts      # kiểm tra luật + 240 ván bot trên đồng hồ giả
├── api/send-code.js     # hàm Vercel: gửi mail mã đăng nhập qua Gmail SMTP
├── client/              # React + Vite + Tailwind + Framer Motion
│   └── src/components/
│       ├── art/         # SVG: Avatar, RoleCard, KeywordCard, Hourglass, Stamp
│       ├── game/        # Night, QAPanel, Discussion, Votes, Result, Seats
│       ├── GameScreen.tsx
│       ├── Lobby.tsx, Home.tsx, Chat.tsx, RulesModal.tsx
├── images/              # bộ thẻ in tự làm (tham khảo; bản online vẽ lại bằng SVG)
└── Insider_Condensed_Rules.pdf
```

---

## Chạy ở máy

```bash
npm install
```

```bash
npm run install:all
```

```bash
npm run dev
```

Server chạy ở `:4200`, client ở `:5190` (khác cổng các game Oink khác nên chạy song song được).
Mở http://localhost:5190.

Chưa cấu hình gửi mail thì mã đăng nhập được in ra console của server và hiện luôn dưới ô nhập mã.
Cấu hình thật nằm trong `server/.env` (xem `server/.env.example`; `.env` đã bị `.gitignore` bỏ qua).

Chơi thử một mình: mở bàn → **+ Thêm bot** ba lần → **Chia vai**. Bạn là Quản trò, bot hỏi, bạn trả lời.
Muốn thử hai người trên một máy: mở tab thứ hai ở `http://127.0.0.1:5190` (khác origin nên có phiên riêng).

Kiểm tra:

```bash
npm test
```

```bash
npm run typecheck
```

---

## Deploy

Client là trang tĩnh, server cần WebSocket chạy liên tục — nên tách đôi:
**Vercel cho client, Render cho server** (giống Deep Sea / Scout).

### 1. Server → Render.com

1. Push repo lên GitHub.
2. Trên Render: **New → Blueprint**, chọn repo. Render đọc `render.yaml` và tạo service `insider-server`.
3. Build xong, copy URL (ví dụ `https://insider-server.onrender.com`).
4. Mở `https://<url>/health` phải thấy `{"ok":true,...}`.
   `hostRestricted: false` nghĩa là **chưa** đặt `HOST_EMAILS` — ai đăng nhập cũng mở được bàn.

Tạo thủ công thay vì Blueprint:

| Mục | Giá trị |
| --- | --- |
| Runtime | Node |
| Build Command | `npm install --prefix server --include=dev && npm run build --prefix server` |
| Start Command | `npm run start --prefix server` |
| Health Check Path | `/health` |

> Gói Free của Render ngủ sau ~15 phút không dùng; lần vào đầu mất 30–60 giây để tỉnh.
> Ván đang chơi dở mất khi server khởi động lại (trạng thái nằm trong RAM); phiên đăng nhập thì không mất.

### 2. Client → Vercel

1. **Add New → Project**, chọn repo, để nguyên thiết lập (Vercel đọc `vercel.json`).
2. Biến môi trường: `VITE_SERVER_URL` = `https://insider-server.onrender.com`
3. Deploy.

### 3. Gửi email mã đăng nhập

Render Free **chặn cổng SMTP**, nên Render nhờ hàm Vercel `api/send-code.js` gửi mail qua Gmail
(hoặc trỏ `MAIL_RELAY_URL` vào relay `oink-mail` dùng chung nếu bạn đã có).

```bash
openssl rand -hex 32
```

**Vercel**: `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=587`, `SMTP_USER` (Gmail), `SMTP_PASS`
(App Password 16 ký tự), `MAIL_FROM="Nội Gián <gmail-cua-ban@gmail.com>"`, `MAIL_RELAY_SECRET` (chuỗi vừa tạo).

**Render**: `MAIL_RELAY_URL=https://<app>.vercel.app/api/send-code`, `MAIL_RELAY_SECRET` (cùng chuỗi),
`HOST_EMAILS` (email được mở bàn, cách nhau bằng dấu phẩy).

Đổi biến môi trường trên Vercel xong phải **Redeploy**. Cách khác: `BREVO_API_KEY` hoặc `RESEND_API_KEY`
trên Render. Thứ tự ưu tiên: Vercel relay → Brevo → Resend → SMTP.

### 4. Nối hai bên

Trên Render đặt `CLIENT_ORIGIN=https://<app>.vercel.app` để siết CORS (nhiều domain cách nhau bằng dấu phẩy,
cho phép `*` kiểu `https://insider-*.vercel.app`).

### Biến môi trường

| Nơi | Biến | Mặc định | Ý nghĩa |
| --- | --- | --- | --- |
| server | `PORT` | `4200` | Render tự đặt |
| server | `CLIENT_ORIGIN` | `*` | Origin được phép |
| server | `SESSION_SECRET` | tự sinh | Khoá ký phiên đăng nhập (30 ngày) — đừng đổi |
| server | `HOST_EMAILS` | (trống = ai cũng mở được) | Email được mở bàn |
| server | `MAIL_RELAY_URL` / `MAIL_RELAY_SECRET` | — | Nhờ Vercel gửi mail (khuyên dùng) |
| server | `BREVO_API_KEY` / `RESEND_API_KEY` | — | Gửi mail qua HTTPS |
| server | `SMTP_*` | — | Gửi mail SMTP (chỉ chạy ở máy) |
| server | `MAIL_FROM` | — | Người gửi |
| Vercel | `SMTP_*`, `MAIL_FROM`, `MAIL_RELAY_SECRET` | — | Cho `api/send-code` |
| client | `VITE_SERVER_URL` | `localhost:4200` khi dev | URL server realtime |

---

## Luật đã cài đặt

- **Vai**: 1 Quản trò (công khai), 1 Nội gián, còn lại Thường dân. Quản trò **lần lượt** từng người
  hoặc **ngẫu nhiên** (chọn ở phòng chờ); bot không bao giờ làm Quản trò.
- **Từ khóa**: rút như bộ thẻ in — lật thẻ trên cùng, số ở mặt sau thẻ kế tiếp chọn dòng 1–6; thẻ dùng rồi
  xuống cuối chồng, hết một vòng thì xáo lại. Một bàn không gặp lại từ đã chơi cho tới khi hết 252 từ.
- **Nhắm mắt**: nhận vai → Quản trò xem từ → Quản trò nhắm, Nội gián xem → mở mắt (kịch bản cố định
  13 giây, mọi màn hình chạy y hệt nhau để không lộ ai đang xem).
- **Hỏi – đáp**: đồng hồ 3/4/5/7 phút (mặc định 5). Mỗi người tối đa 2 câu chờ trả lời; đoán cách nhau 3 giây,
  không đoán lại từ đã sai. Hết giờ chưa ai đoán ra: **cả bàn thua**. Quản trò không được nói từ khóa trong chat.
- **Thảo luận**: đồng hồ lật ngược — dài bằng thời gian hỏi đã dùng (tối thiểu 30 giây). Mọi người
  sẵn sàng thì bỏ phiếu sớm.
- **Biểu quyết 1**: mọi người trừ người đoán trả lời “người đoán có phải Nội gián?”. Quá nửa số phiếu nói Có
  mới là kết tội (hòa không tính). Người đoán lật vai:
  - kết tội đúng Nội gián → Quản trò & Thường dân thắng;
  - kết tội nhầm, hoặc tin nhầm Nội gián → Nội gián thắng;
  - tin đúng là Thường dân → biểu quyết 2.
- **Biểu quyết 2**: ai cũng chỉ vào một người còn giấu vai (không phải Quản trò, không phải người đoán,
  không phải chính mình). Nhiều phiếu nhất là Nội gián → Quản trò & Thường dân thắng, không thì Nội gián thắng.
  Hòa phiếu: người đoán quyết định.
- **Điểm**: mỗi ván thắng được +1 (🏆), cộng dồn suốt buổi ở bàn.
- Biến thể nâng cao “có thể không có Nội gián” trong PDF **chưa** cài.

### Chống treo bàn

- Mỗi lần bỏ phiếu có 45 giây; ai không bỏ thì không tính phiếu. Hòa phiếu chờ người đoán 25 giây rồi chọn ngẫu nhiên.
- Người mất mạng không chặn được ai: bỏ phiếu và “sẵn sàng” chỉ chờ người đang online.
- Chủ bàn rớt mạng quá 20 giây thì bàn tự chuyển chủ cho người khác.
- Bàn không ai dùng trong 1 giờ sẽ tự xoá.

---

## Bản quyền

Insider do **Akihiro Itoh, Kito Shinzuke, Kwaji và Daichi Okano** thiết kế, **Oink Games** phát hành.
Đây là bản dựng lại phi thương mại để chơi cùng bạn bè: bộ 252 từ tiếng Việt tự biên soạn, mọi hình vẽ lại bằng SVG,
không dùng logo Oink Games. Nếu thích, hãy mua bản giấy — nhỏ gọn và rất vui.
