.PHONY: install run start clean check-node

install:
	@echo ">> Sinkronisasi paket Termux (mencegah konflik versi library)..."
	pkg update -y && pkg upgrade -y
	@echo ">> Install Node.js LTS + dependency build native..."
	pkg install -y nodejs-lts git python make clang
	@echo ">> Install dependencies npm..."
	npm install --omit=dev
	@echo ">> Selesai. Jalankan: make run"

check-node:
	@NODE_MAJOR=$$(node -v | sed 's/v\([0-9]*\).*/\1/'); \
	if [ "$$NODE_MAJOR" -lt 18 ] || [ "$$NODE_MAJOR" -gt 24 ]; then \
		echo "⚠️  Versi Node.js Anda ($$( node -v )) tidak didukung."; \
		echo "   Jalankan: pkg install -y nodejs-lts"; \
		exit 1; \
	fi

run: check-node
	@echo ">> Menjalankan server..."
	@clear
	@node cli.js

start: run

clean:
	rm -rf node_modules data/auth
