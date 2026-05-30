# Dashboard & LINE Notification System

ระบบ Dashboard วิเคราะห์ธุรกิจและแจ้งเตือน LINE สำหรับจัดการยอดขายและรายจ่าย ทำงานแบบ Real-time พร้อม UI ที่สะอาดตา สวยงาม และ Responsive 100%

---

## 🏗️ Architecture & Technologies

ระบบนี้ใช้สถาปัตยกรรมแยกส่วนระหว่าง Frontend และ Backend (Decoupled Architecture):

### 1. Frontend (Next.js 15+ & React 19)
- **Framework:** Next.js (App Router, TypeScript)
- **Charts:** Recharts (Interactive Dashboard Visualizations)
- **Animations:** Framer Motion (Smooth page transitions, hover states, list staggers)
- **Styling:** CSS Modules (Vanilla CSS, clean scope, customized CSS variables)
- **Icons:** Lucide React

### 2. Backend (Python FastAPI)
- **Framework:** FastAPI (High performance, modern Python asynchronous backend)
- **Database ORM:** SQLModel (Combines Pydantic & SQLAlchemy for optimal type safety)
- **Database:** SQLite (`dashboard.db` - Lightweight & Zero-config)
- **Integrations:** LINE Notify API (Thai-formatted alerts on new transaction & daily summaries)

---

## 📂 Project Structure

```
d:/Dashboard_Line_A/
├── start.bat               # Windows Batch file สำหรับเริ่มทำงานทั้งระบบในคลิกเดียว
├── backend/                # FastAPI Python Backend
│   ├── main.py             # Entry point + lifespan database auto-seed
│   ├── database.py         # SQLite configurations
│   ├── models.py           # SQLModel database tables & Pydantic schemas
│   ├── requirements.txt    # Python dependencies
│   ├── routers/            # API Router groups (Dashboard, Transactions, etc.)
│   └── services/           # LINE Notify & data seeding services
└── frontend/               # Next.js Frontend
    ├── src/
    │   ├── app/            # Next.js App Router (Dashboard, Transactions, Reports, Settings, Notifications)
    │   ├── components/     # UI, Layouts & Recharts components
    │   ├── contexts/       # App Global Context & Toast alert system
    │   └── lib/            # API client (with mock data fallback) and Thai formatting utils
    └── package.json        # Node.js dependencies
```

---

## ⚡ วิธีใช้งาน (How to Run)

### 📌 สำหรับ Windows (วิธีที่ง่ายที่สุด)
1. ดับเบิ้ลคลิกไฟล์ `start.bat` ในโฟลเดอร์โปรเจค
2. ระบบจะเปิด 2 หน้าต่าง Command Prompt:
   - **Backend Window:** จะรัน `pip install` เพื่อติดตั้ง Package และเปิดเซิร์ฟเวอร์ที่ `http://localhost:8000`
   - **Frontend Window:** จะเปิดเซิร์ฟเวอร์ Next.js ที่ `http://localhost:3000`
3. เปิดเว็บเบราว์เซอร์ไปที่: **[http://localhost:3000](http://localhost:3000)**

---

### 📌 รันแยกทีละส่วนด้วยตัวเอง (Manual Start)

#### 1. สตาร์ท Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```
- **API Documentation:** เข้าถึง Swagger UI ได้ที่ [http://localhost:8000/docs](http://localhost:8000/docs)

#### 2. สตาร์ท Frontend
```bash
cd frontend
npm run dev
```
- **Web App:** เข้าถึงหน้าเว็บได้ที่ [http://localhost:3000](http://localhost:3000)

---

## 🌟 จุดเด่นระบบที่ติดตั้งสำเร็จ (Key Features Built)

1. **📊 หน้า Dashboard ภาพรวมสุดหรู**
   - 3 Summary Cards: รายรับวันนี้, รายจ่ายวันนี้, และกำไรสุทธิ แสดงเปอร์เซ็นต์เทียบกับเมื่อวาน พร้อม Sparkline chart
   - 3 Interactive Charts: กราฟแท่งรายรับ-รายจ่ายรายวัน (7 วัน), กราฟเส้นเปรียบเทียบรายเดือน (12 เดือน), และกราฟวงกลมแยกสัดส่วนค่าใช้จ่ายตามหมวดหมู่
   - รายการล่าสุด 5 รายการล่าสุด อัปเดตทันที

2. **💰 ระบบจัดการธุรกรรม (Transactions CRUD)**
   - ตารางรายรับ-รายจ่ายที่อัปเดตแบบ Dynamic
   - ระบบตัวกรองแบบละเอียด (Filter by Type, Date range, Search keywords, Category)
   - โมดอลสำหรับเพิ่ม/แก้ไขรายการธุรกรรมอย่างสมบูรณ์แบบพร้อม Form Validation
   - การแบ่งหน้า (Pagination)

3. **📈 หน้ารายงานขั้นสูง (Advanced Reports)**
   - สรุปยอดตามช่วงเวลาที่กำหนด (รายวัน, รายสัปดาห์, รายเดือน, รายปี)
   - แสดงผลในรูปแบบ Comparison Charts
   - ปุ่มดาวน์โหลดรายงานออกมาเป็นไฟล์ CSV

4. **💬 จำลอง LINE Notification Panel**
   - หน้าแชทจำลองสไตล์ LINE Notify (ฟองคำพูดแชทสีเขียว/ขาว) อัปเดตแบบ Real-time เมื่อเกิดธุรกรรมใหม่ในระบบ
   - แยกสีและไอคอนตามสถานะทางการเงิน

5. **⚙️ หน้าตั้งค่า (Settings & Configuration)**
   - แก้ไขข้อมูลร้านค้า/ชื่อแบรนด์
   - ใส่ **LINE Notify Token** และปุ่มทดสอบส่งการแจ้งเตือนเข้าไปที่ LINE จริงๆ
   - ระบบจัดการหมวดหมู่ (CRUD Categories) พร้อมสีและไอคอนให้เลือก
   - ปุ่มรีเซ็ตข้อมูลสำหรับการทดสอบ (Reset Demo Data)