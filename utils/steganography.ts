import JSZip from 'jszip';

// Maximum safe dimension for canvas on most mobile devices to prevent crashes
const MAX_DIMENSION = 8192; 

// --- Crypto Helpers ---

// Generate a cryptographic key from password and salt
const deriveKey = async (password: string, salt: Uint8Array): Promise<CryptoKey> => {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );
  
  return window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
};

// --- Main Logic ---

// Calculate max capacity in bytes
export const calculateCapacity = (width: number, height: number): number => {
  // 3 channels (RGB), 1 bit per channel per pixel
  // Capacity in bits = w * h * 3
  // Capacity in bytes = (w * h * 3) / 8
  return Math.floor((width * height * 3) / 8);
};

export const hideFiles = async (
  coverImageFile: File,
  secretFiles: File[],
  password: string
): Promise<{ blob: Blob, isResized: boolean, originalDimensions: string, newDimensions: string }> => {
  return new Promise(async (resolve, reject) => {
    try {
      if (!password) {
        throw new Error("كلمة المرور مطلوبة لإتمام العملية.");
      }

      // 1. Zip the secret files
      const zip = new JSZip();
      secretFiles.forEach((file) => {
        zip.file(file.name, file);
      });
      const zipContent = await zip.generateAsync({
        type: 'uint8array',
        compression: 'DEFLATE',
        compressionOptions: { level: 9 },
      });

      // 2. Encrypt the Zip Content
      const salt = window.crypto.getRandomValues(new Uint8Array(16)); // 16 bytes salt
      const iv = window.crypto.getRandomValues(new Uint8Array(12));   // 12 bytes IV
      const key = await deriveKey(password, salt);
      
      const encryptedContentBuffer = await window.crypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv },
        key,
        zipContent
      );
      const encryptedContent = new Uint8Array(encryptedContentBuffer);

      // Payload Structure:
      // [Length (4 bytes)] + [Salt (16 bytes)] + [IV (12 bytes)] + [Encrypted Data (variable)]
      const headerSize = 4 + 16 + 12; 
      const totalPayloadSize = headerSize + encryptedContent.length;

      // 3. Prepare Image
      const img = new Image();
      const url = URL.createObjectURL(coverImageFile);

      img.onload = () => {
        URL.revokeObjectURL(url);
        
        // Smart Capacity Check & Resize Calculation
        let targetWidth = img.width;
        let targetHeight = img.height;
        let isResized = false;
        
        const currentCapacity = calculateCapacity(targetWidth, targetHeight);

        if (totalPayloadSize > currentCapacity) {
            isResized = true;
            // Calculate required pixels: (Bytes * 8 bits) / 3 channels
            const requiredPixels = Math.ceil((totalPayloadSize * 8) / 3);
            const currentPixels = targetWidth * targetHeight;
            
            // Add 5% buffer for safety
            const scaleFactor = Math.sqrt((requiredPixels / currentPixels) * 1.05);
            
            targetWidth = Math.ceil(targetWidth * scaleFactor);
            targetHeight = Math.ceil(targetHeight * scaleFactor);
        }

        // --- Safety Check for Dimensions ---
        if (targetWidth > MAX_DIMENSION || targetHeight > MAX_DIMENSION) {
             reject(new Error(`حجم الملفات كبير جداً! يتطلب صورة بأبعاد ${targetWidth}x${targetHeight} وهو ما يتجاوز قدرة المتصفح. حاول تقليل عدد الملفات.`));
             return;
        }

        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('Canvas context not supported'));
          return;
        }

        // Draw image
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // 4. Construct Final Payload Buffer
        const payload = new Uint8Array(totalPayloadSize);
        const dataView = new DataView(payload.buffer);
        
        // Write Length of Encrypted Content (not total payload, just the ciphertext part)
        dataView.setUint32(0, encryptedContent.length); 
        
        // Write Salt
        payload.set(salt, 4);
        
        // Write IV
        payload.set(iv, 4 + 16);
        
        // Write Encrypted Data
        payload.set(encryptedContent, 4 + 16 + 12);

        // Final Capacity Check
        const finalCapacity = calculateCapacity(canvas.width, canvas.height);
        if (payload.length > finalCapacity) {
          reject(new Error(`خطأ غير متوقع: الصورة صغيرة جداً حتى بعد التكبير.`));
          return;
        }

        // 5. Embed Data (LSB)
        let dataIndex = 0; // byte index
        let bitIndex = 0;  // bit index (0-7)

        for (let i = 0; i < data.length; i += 4) {
          if (dataIndex >= payload.length) break;

          // Iterate RGB channels (0, 1, 2). Skip Alpha (3).
          for (let j = 0; j < 3; j++) {
            if (dataIndex >= payload.length) break;

            const byte = payload[dataIndex];
            const bit = (byte >> (7 - bitIndex)) & 1;

            // Clear LSB and set new bit
            data[i + j] = (data[i + j] & ~1) | bit;

            bitIndex++;
            if (bitIndex === 8) {
              bitIndex = 0;
              dataIndex++;
            }
          }
        }

        ctx.putImageData(imageData, 0, 0);
        
        // 6. Output Blob
        canvas.toBlob((blob) => {
          if (blob) {
            resolve({
              blob,
              isResized,
              originalDimensions: `${img.width}x${img.height}`,
              newDimensions: `${targetWidth}x${targetHeight}`
            });
          }
          else reject(new Error('Failed to create image blob'));
        }, 'image/png');
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = url;

    } catch (e) {
      reject(e);
    }
  });
};

export const extractFiles = async (encodedImageFile: File, password: string): Promise<JSZip> => {
  return new Promise((resolve, reject) => {
    if (!password) {
      reject(new Error("الرجاء إدخال كلمة المرور لفك التشفير."));
      return;
    }

    const img = new Image();
    const url = URL.createObjectURL(encodedImageFile);

    img.onload = async () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });

      if (!ctx) {
        reject(new Error('Canvas context not supported'));
        return;
      }

      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // 1. Extract Header (Length: 4 bytes + Salt: 16 bytes + IV: 12 bytes = 32 bytes)
      const headerSize = 32;
      const headerBuffer = new Uint8Array(headerSize);
      
      let pixelIndex = 0;
      let currentByte = 0;
      let currentBitIndex = 0;

      // Extract fixed header first
      while (currentByte < headerSize && pixelIndex < data.length) {
        for (let j = 0; j < 3; j++) {
           if (currentByte >= headerSize) break;
           
           const bit = data[pixelIndex + j] & 1;
           if (bit) {
             headerBuffer[currentByte] |= (1 << (7 - currentBitIndex));
           }
           
           currentBitIndex++;
           if (currentBitIndex === 8) {
             currentBitIndex = 0;
             currentByte++;
           }
        }
        pixelIndex += 4;
      }

      // Parse Header
      const encryptedDataLength = new DataView(headerBuffer.buffer).getUint32(0);
      const salt = headerBuffer.slice(4, 20);
      const iv = headerBuffer.slice(20, 32);

      // Basic Sanity Check on Length
      const maxPossible = calculateCapacity(canvas.width, canvas.height);
      if (encryptedDataLength === 0 || encryptedDataLength > maxPossible) {
        // Obfuscated error message
        reject(new Error('لم يتم العثور على ملفات داخل هذه الصورة.')); 
        return;
      }

      // 2. Extract Encrypted Body
      const encryptedBody = new Uint8Array(encryptedDataLength);
      currentByte = 0; 
      currentBitIndex = 0;
      
      const totalPayloadSize = headerSize + encryptedDataLength;
      const fullPayloadBuffer = new Uint8Array(totalPayloadSize);
      
      let extractedIndex = 0;
      let bitPos = 0;

      for (let i = 0; i < data.length; i += 4) {
        if (extractedIndex >= totalPayloadSize) break;
        
        for (let j = 0; j < 3; j++) {
          if (extractedIndex >= totalPayloadSize) break;

          const bit = data[i + j] & 1;
          if (bit) {
             fullPayloadBuffer[extractedIndex] |= (1 << (7 - bitPos));
          }
          
          bitPos++;
          if (bitPos === 8) {
            bitPos = 0;
            extractedIndex++;
          }
        }
      }

      const extractedCiphertext = fullPayloadBuffer.slice(32); // Skip header

      // 3. Decrypt
      try {
        const key = await deriveKey(password, salt);
        const decryptedBuffer = await window.crypto.subtle.decrypt(
          { name: "AES-GCM", iv: iv },
          key,
          extractedCiphertext
        );

        const zip = await JSZip.loadAsync(decryptedBuffer);
        resolve(zip);
      } catch (e) {
        // CRITICAL: Return generic error if decryption fails (wrong password or no data)
        // to maintain plausible deniability.
        console.error("Decryption failed:", e);
        reject(new Error('لم يتم العثور على ملفات داخل هذه الصورة.'));
      }
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = url;
  });
};