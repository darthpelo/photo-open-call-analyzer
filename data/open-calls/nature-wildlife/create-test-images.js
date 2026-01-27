import sharp from 'sharp';
import { mkdir } from 'fs/promises';
import { dirname } from 'path';

const testDir = new URL('.', import.meta.url).pathname;
const photosDir = `${testDir}photos`;

await mkdir(photosDir, { recursive: true });

// Create a simple blue test image with text
const blueImage = await sharp({
  create: {
    width: 1000,
    height: 800,
    channels: 3,
    background: { r: 30, g: 100, b: 200 },
  },
})
  .png()
  .toBuffer();

await sharp(blueImage)
  .composite([
    {
      input: Buffer.from(
        `<svg width="1000" height="800">
          <rect width="1000" height="800" fill="rgb(30, 100, 200)"/>
          <text x="500" y="300" font-size="72" fill="white" text-anchor="middle" font-weight="bold">
            Wildlife Photography
          </text>
          <text x="500" y="400" font-size="48" fill="white" text-anchor="middle">
            Natural Habitat
          </text>
        </svg>`
      ),
      gravity: 'center',
    },
  ])
  .jpeg({ quality: 90 })
  .toFile(`${photosDir}/test-wildlife-01.jpg`);

console.log('✓ Created test-wildlife-01.jpg');

// Create a simple green test image
const greenImage = await sharp({
  create: {
    width: 1000,
    height: 800,
    channels: 3,
    background: { r: 50, g: 150, b: 50 },
  },
})
  .jpeg({ quality: 90 })
  .toFile(`${photosDir}/test-wildlife-02.jpg`);

console.log('✓ Created test-wildlife-02.jpg');

console.log('Test images created successfully!');
