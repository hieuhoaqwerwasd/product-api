# Product API — thực hành tuần tự PROMPT 1

Repository: https://github.com/hieuhoaqwerwasd/product-api

## 1–4. Chuẩn bị, clone và VS Code

Không xóa repository đã có. Nếu cần luyện clone, mở VS Code → Terminal → Select Default Profile → Git Bash, mở terminal mới tại thư mục cha trống rồi chạy:

```bash
git clone https://github.com/hieuhoaqwerwasd/product-api.git
cd product-api
code .
docker version
docker info
```

Docker Desktop phải chạy Linux containers. Container Tools của Microsoft trong VS Code giúp xem container; CLI dùng cùng Docker Engine. Không cần bật TCP daemon. Thao tác clone/Git Bash trong VS Code cần người học tự thực hành, không xem lịch sử push là bằng chứng đã clone.

## 5–6. MongoDB và Node chạy trực tiếp với .env

Máy hiện tại đã có container `nammongodb` và `.env`. KHÔNG chạy lại docker run trùng tên, không ghi đè .env.

Trên máy mới, chưa có container/volume của bài:

```bash
cp .env.example .env
docker run -d --name nammongodb -p 127.0.0.1:27017:27017 -v product-api_mongo_data:/data/db mongo:7
npm ci
npm start
```

Ứng dụng đọc PORT và MONGODB_URI từ `.env` bằng dotenv. Node trên host: http://localhost:3000/api/health. MongoDB trên host: localhost:27017. Mở terminal thứ hai để kiểm thử:

```bash
BASE_URL=http://localhost:3000 node scripts/smoke.js
```

Máy hiện tại dùng volume `bt-p1_mongo_data` trong .env để giữ sản phẩm của các lượt trước. Container Mongo cũ không thuộc bài đã đổi tên `nammongodb-before-prompt-fix`, dữ liệu nguyên vẹn.

## 7–9. Dockerize, Compose, health

Dừng Node bằng Ctrl+C. Khi chuyển container Mongo tạo bằng docker run sang Compose trên máy mới, dừng và đổi tên container standalone trước (không xóa volume):

```bash
docker stop nammongodb
docker rename nammongodb nammongodb-standalone-backup
```

Bước chuyển trên CHỈ dùng cho container standalone; máy hiện tại đã chuyển sang Compose, bỏ qua.

```bash
docker compose up -d --build --wait --wait-timeout 180
docker compose ps
curl http://localhost:3001/api/health
npm test
node scripts/smoke.js
```

Nhóm Compose `product-api`, container `product-api` và `nammongodb`. Node trong container nhận DOCKER_MONGODB_URI từ .env (hostname mongodb); PORT là cổng trong container, API_PORT là cổng host. API healthcheck ở Dockerfile, Mongo healthcheck ở compose.yaml. Health API ping DB trước khi trả UP.

API CRUD: POST/GET `/api/products`, GET/PUT/DELETE `/api/products/:pid`. Các trường pid, pname, price, quantity. Import `postman/product-api.postman_collection.json`, baseUrl `http://localhost:3001/api`. Tạo sản phẩm, ghi lại pid và đối chiếu:

```bash
docker compose exec mongodb mongosh productdb --quiet --eval 'db.products.find().toArray()'
docker compose logs --tail 50 product-api
```

## 10–12. CI và Docker Hub

- `.github/workflows/test-productci.yml`: unit tests.
- `.github/workflows/test-productci-prod.yml`: tạo .env CI từ mẫu không có secret, build Compose, đợi healthy, kiểm thử CRUD với MongoDB thật trên GitHub runner. Sau khi pass mới publish image gắn tag commit SHA và latest.
- GitHub variable DOCKERHUB_USERNAME=phamhieuhoa; secret DOCKERHUB_TOKEN lưu token trên GitHub, không nằm trong source/.env.example.

## 13–14. Docker Hub về local Docker Engine

`docker-compose-prod.yaml` dùng image Docker Hub thay cho build source. Cả hai chế độ dùng cùng nhóm/container/volume và cổng 3001: chúng THAY THẾ nhau, không chạy hai stack song song.

Git Bash, triển khai thủ công:

```bash
docker compose -f docker-compose-prod.yaml pull
docker compose -f docker-compose-prod.yaml up -d --wait --wait-timeout 180
node scripts/smoke.js
```

`.env` đặt DOCKERHUB_IMAGE=phamhieuhoa/product-api, IMAGE_TAG=latest; có thể đổi IMAGE_TAG sang commit đã CI pass.

Tự động: runner Windows x64 label product-api-local, Docker Desktop và Node sẵn sàng; workflow dùng Windows PowerShell. Variable ENABLE_LOCAL_CD=true, environment local-demo. Runner tạo .env từ mẫu nếu chưa có và nhận image/tag qua biến môi trường job. MONGO_VOLUME của job hiện là bt-p1_mongo_data để dùng đúng dữ liệu local hiện có; trên máy mới cần sửa tên volume này cho khớp .env trước khi bật CD.

Giữ runner đang Listening for Jobs. Push main → integration → publish → deploy-local. Bản CD mới kiểm tra cổng 3001; cổng 3011 trong ảnh/lịch sử cũ không còn áp dụng cho cấu hình mới.

## Bảo vệ cấu hình và dữ liệu

.env chỉ trên máy; Git và Docker build đều bỏ qua. .env.example là mẫu không chứa secret. Kiểm tra `git ls-files .env` phải không có kết quả và `git check-ignore .env` phải trả .env.

Không dùng `docker compose down -v` nếu muốn giữ dữ liệu. Những container bt-p1/bt-p1-prod cũ được giữ dừng để khôi phục; không khởi động Mongo cũ đồng thời với nammongodb vì cùng volume local.
