
/**
 * Simple End-to-End Encryption Utility for RoomOS
 * Uses the Web Crypto API (SubtleCrypto)
 */

// Generate a new RSA-OAEP key pair for a user
export const generateKeyPair = async () => {
    const keyPair = await window.crypto.subtle.generateKey(
        {
            name: "RSA-OAEP",
            modulusLength: 2048,
            publicExponent: new Uint8Array([1, 0, 1]),
            hash: "SHA-256",
        },
        true,
        ["encrypt", "decrypt"]
    );

    const publicKeyJWK = await window.crypto.subtle.exportKey("jwk", keyPair.publicKey);
    const privateKeyJWK = await window.crypto.subtle.exportKey("jwk", keyPair.privateKey);

    return {
        publicKey: JSON.stringify(publicKeyJWK),
        privateKey: JSON.stringify(privateKeyJWK),
    };
};

// Encrypt a message using a recipient's public key (JWK string)
export const encryptMessage = async (text, publicKeyJWKString) => {
    try {
        const jwk = JSON.parse(publicKeyJWKString);
        const publicKey = await window.crypto.subtle.importKey(
            "jwk",
            jwk,
            { name: "RSA-OAEP", hash: "SHA-256" },
            true,
            ["encrypt"]
        );

        const encodedMessage = new TextEncoder().encode(text);
        const encryptedBuffer = await window.crypto.subtle.encrypt(
            { name: "RSA-OAEP" },
            publicKey,
            encodedMessage
        );

        // Convert buffer to base64 for transport
        return btoa(String.fromCharCode(...new Uint8Array(encryptedBuffer)));
    } catch (error) {
        console.error("Encryption failed:", error);
        return null;
    }
};

// Decrypt a message using own private key (JWK string)
export const decryptMessage = async (base64Ciphertext, privateKeyJWKString) => {
    try {
        const jwk = JSON.parse(privateKeyJWKString);
        const privateKey = await window.crypto.subtle.importKey(
            "jwk",
            jwk,
            { name: "RSA-OAEP", hash: "SHA-256" },
            true,
            ["decrypt"]
        );

        const encryptedBuffer = new Uint8Array(
            atob(base64Ciphertext)
                .split("")
                .map((char) => char.charCodeAt(0))
        );

        const decryptedBuffer = await window.crypto.subtle.decrypt(
            { name: "RSA-OAEP" },
            privateKey,
            encryptedBuffer
        );

        return new TextDecoder().decode(decryptedBuffer);
    } catch (error) {
        console.warn("Decryption failed (maybe not an encrypted message?):", error);
        return null; // Return null if it's not a valid encrypted message
    }
};

// For Group Chat: We'll use a shared Group Secret (simplified for this demo)
// In a real app, this would be a symmetric key shared among group members via asymmetric encryption
export const deriveGroupKey = async (passphrase) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(passphrase);
    const hash = await window.crypto.subtle.digest("SHA-256", data);

    return window.crypto.subtle.importKey(
        "raw",
        hash,
        { name: "AES-GCM" },
        false,
        ["encrypt", "decrypt"]
    );
};

export const encryptSymmetric = async (text, key) => {
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(text);
    const encrypted = await window.crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        key,
        encoded
    );

    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);

    return btoa(String.fromCharCode(...combined));
};

export const decryptSymmetric = async (base64Data, key) => {
    try {
        const combined = new Uint8Array(
            atob(base64Data).split("").map(c => c.charCodeAt(0))
        );
        const iv = combined.slice(0, 12);
        const data = combined.slice(12);

        const decrypted = await window.crypto.subtle.decrypt(
            { name: "AES-GCM", iv },
            key,
            data
        );

        return new TextDecoder().decode(decrypted);
    } catch (e) {
        return null;
    }
};
