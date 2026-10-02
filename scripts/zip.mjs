// Đóng gói dist/ thành file zip để upload lên Facebook Instant Games (index.html phải nằm ở gốc zip).
import { ZipArchive } from 'archiver';
import { createWriteStream, existsSync, statSync } from 'node:fs';

if (!existsSync('dist/index.html')) {
  console.error('Chưa có dist/. Chạy "npm run build" trước.');
  process.exit(1);
}
const outFile = 'ngon-lua-cuoi-cung-fb.zip';
const output = createWriteStream(outFile);
const archive = new ZipArchive({ zlib: { level: 9 } });
output.on('close', () => {
  const mb = (statSync(outFile).size / 1024 / 1024).toFixed(2);
  console.log(`Đã tạo ${outFile} (${mb} MB)`);
});
archive.on('error', (e) => { throw e; });
archive.pipe(output);
archive.directory('dist/', false);
await archive.finalize();
