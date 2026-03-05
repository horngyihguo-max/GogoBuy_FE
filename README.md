[GogoBuy] - 電子商務前端專案
專案簡介
GogoBuy 是一個現代化的電子商務平台前端介面，旨在提供流暢的購物體驗。使用者可以瀏覽商品、加入購物車、管理會員資料，並進行模擬結帳流程。

線上演示： 點擊查看 Demo 連結 (若有 Vercel/Netlify 部署請放這)

核心功能
商品瀏覽：支援分類篩選、關鍵字搜尋及分頁功能。

購物車系統：即時更新商品數量、計算總金額。

會員系統：包含註冊、登入、個人資料編輯及訂單歷史查詢。

響應式設計 (RWD)：適應手機與桌機螢幕。

結帳流程：模擬金流表單驗證與訂單生成。

🛠 使用技術
框架：ANGULAR 19+

狀態管理：Redux Toolkit / Pinia / React Context API

樣式核心：Tailwind CSS / Styled-components / SCSS

路由：ANGULAR Router

API 串接：Axios (搭配 RESTful API)

學習筆記 / 挑戰

效能優化：如何處理圖片加載，GOOGLE LH3多次拉取會造成ERROR 429，更改為使用圖床存取圖片，避免出現ERROR 429，使圖片破圖。

狀態同步：解決購物車在多個頁面間資料同步的問題。

驗證機制：使用 JWT 進行路由守衛 (Route Guard) 的心得。

🤝 貢獻指南
如果你有任何改進建議，歡迎提交 Pull Request 或開 Issue 討論！
