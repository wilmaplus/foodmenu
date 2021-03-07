/*
 * Copyright (c) 2021 wilmaplus-foodmenu, developed by @developerfromjokela, for Wilma Plus mobile app
 */
import * as crypto from "crypto"
import {Hash} from "crypto";

export class HashUtils {

    private static sha1Hash(content: string): Hash {
        return crypto.createHash('sha1').update(content);
    }

    private static sha256Hash(content: string): Hash {
        return crypto.createHash('sha256').update(content);
    }

    static sha1Digest(content: string): string {
        return HashUtils.sha1Hash(content).digest("hex");
    }

    static sha1DigestBuffer(content: string): Buffer {
        return HashUtils.sha1Hash(content).digest();
    }

    static sha256Digest(content: string): string {
        return HashUtils.sha256Hash(content).digest("hex");
    }

    static sha256DigestBuffer(content: string): Buffer {
        return HashUtils.sha256Hash(content).digest();
    }


}
