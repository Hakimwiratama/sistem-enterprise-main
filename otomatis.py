import json

TARGET_SIZE = 2_800_000
products = {
    "name": "Mouse Wireless Pro",
    "description": "Mouse wireless ergonomis dengan koneksi stabil untuk kebutuhan kuliah dan pekerjaan",
    "price": 175000,
    "stock": 25,
    "image": "",
}

empty_payload = json.dumps(products, indent=2, ensure_ascii=False)
image_length = TARGET_SIZE - len(empty_payload)
image_length -= image_length % 4
products["image"] = "A" * image_length

final_data = json.dumps(products, indent=2, ensure_ascii=False)
nama_file = "product_data_2800000.txt"

with open(nama_file, "w", encoding="utf-8") as file:
    file.write(final_data)

print("====================================")
print("FILE BERHASIL DIBUAT")
print("====================================")
print(f"Nama file : {nama_file}")
print(f"Jumlah karakter : {len(final_data):,}")
print(f"Ukuran file : {len(final_data.encode('utf-8')):,} bytes")
print("====================================")
