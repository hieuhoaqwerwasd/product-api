# Product API — bài thực hành 1

Node.js/Express + Mongoose + MongoDB. API local: `http://localhost:3001/api`.

## Chạy và kiểm tra

Mở thư mục này trong VS Code. Terminal PowerShell hoặc Git Bash:

```sh
docker compose up -d --build --wait
docker compose ps
node scripts/smoke.js
npm test
docker compose logs --tail 50 product-api
docker compose exec mongodb mongosh productdb --quiet --eval 'db.products.find().toArray()'
```

Chạy `npm ci` trước `npm test` khi clone mới. Health: `GET /api/health`, trả 200 khi MongoDB ping được, 503 khi lỗi. Import `postman/product-api.postman_collection.json`, chạy Collection Runner. Request tạo Product giữ lại một sản phẩm để kiểm tra bằng mongosh; smoke script riêng sẽ xóa sản phẩm test của nó.

CRUD: GET/POST `/api/products`, GET/PUT/DELETE `/api/products/:pid`. POST body:

```json
{"pid":1,"pname":"X","price":100,"quantity":10}
```

PUT chỉ nhận các trường muốn đổi, không đổi pid. pid trùng -> 409, số lượng âm/lẻ -> 400, không tìm thấy -> 404. Bài 1 không yêu cầu JWT; chỉ publish cổng API trên 127.0.0.1. Database ở mạng Docker nội bộ.

Container MongoDB mới tên `nammongodb-bt1` vì máy đã có `nammongodb` cũ. Dùng tên service `mongodb` trong lệnh Compose để không phụ thuộc tên container.

## .env và Docker

`.env` chứa cấu hình local và bị `.gitignore` loại khỏi Git; `.env.example` được commit để người clone biết biến cần tạo. Không đưa password/token thật lên GitHub. Docker build cũng loại `.env` bằng `.dockerignore`. Compose cấp MONGODB_URI cho API bằng hostname `mongodb`.

Chạy Node ngoài Docker: copy `.env.example` thành `.env` và dùng MongoDB bạn đã publish ra localhost. Stack Compose mặc định không publish DB, nên cách demo được khuyến nghị là chạy cả API và DB bằng Compose.

## GitHub Actions và Docker Hub

Repository: https://github.com/hieuhoaqwerwasd/product-api

1. GitHub Settings → Secrets and variables → Actions: thêm variable `DOCKERHUB_USERNAME=phamhieuhoa`, secret `DOCKERHUB_TOKEN` là access token Docker Hub có quyền push repository này. Không dùng password/token trong source.
2. `test-productci.yml`: npm ci + unit test trên push/PR.
3. `test-productci-prod.yml`: build/health + CRUD MongoDB thật. Chỉ khi job integration pass trên main mới publish `phamhieuhoa/product-api:<commit-sha>` và `:latest`.
4. Local CD: tạo self-hosted Windows x64 runner trong repository Settings → Actions → Runners, thêm label `product-api-local`. Runner cần Docker Desktop đang chạy, Node 22+ và PowerShell 7 (`pwsh`). Tạo Environment `local-demo`, variable `ENABLE_LOCAL_CD=true` khi runner sẵn sàng. Không bật job này khi chưa có runner.
5. Workflow local-CD pull tag đúng commit rồi `up --wait`, chạy smoke trên cổng 3011. Runner chỉ dùng cho repository tin cậy; job không chạy trên pull request.

Chạy bản Docker Hub thủ công sau khi có image:

```powershell
$env:DOCKERHUB_IMAGE='phamhieuhoa/product-api'
$env:IMAGE_TAG='latest' # Hoặc commit SHA đã CI pass
docker compose -f docker-compose-prod.yaml pull
docker compose -f docker-compose-prod.yaml up -d --wait
$env:BASE_URL='http://localhost:3011'
node scripts/smoke.js
```

Tạo thay đổi và thêm test mới: chỉnh `src/validation.js`, thêm trường hợp biên vào `test/validation.test.js`; chạy npm test rồi push. Khi vấn đáp, có thể thêm test tên rỗng hoặc giá âm để trình diễn CI.

Dừng stack: `docker compose down`. Không thêm `-v` nếu muốn giữ dữ liệu.
