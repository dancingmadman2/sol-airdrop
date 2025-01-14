import fs from 'fs';
import { parse } from 'csv-parse/sync';
import { CONFIG } from '../config';
import path from 'path';

interface Recipient {
  address: string;
}

export class FileReader {
  static read(): Recipient[] {
    const filePath = path.resolve(__dirname, '../../', CONFIG.fileConfig.path);
    
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const fileContent = fs.readFileSync(filePath, 'utf-8');
    try {
      switch (CONFIG.fileConfig.type.toLowerCase()) {
        case 'json':
          return this.parseJson(fileContent);
        case 'csv':
          return this.parseCsv(fileContent);
        default:
          throw new Error(`Unsupported file type: ${CONFIG.fileConfig.type}. Please use 'json' or 'csv'`);
      }
    } catch (error:any) {
      throw new Error(`Error reading ${CONFIG.fileConfig.type} file: ${error.message}`);
    }
  }

  private static parseJson(content: string): Recipient[] {
    const data = JSON.parse(content);
    this.validateRecipients(data);
    return data;
  }

  private static parseCsv(content: string): Recipient[] {
    const records = parse(content, {
      columns: false,
      skip_empty_lines: true,
      trim: true
    });

    const recipients = records.map((record: string[]) => ({
      address: record[0]
    }));

    this.validateRecipients(recipients);
    return recipients;
  }

  private static validateRecipients(recipients: any[]): void {
    if (!Array.isArray(recipients)) {
      throw new Error('Invalid format: Expected an array of recipients');
    }

    recipients.forEach((recipient, index) => {
      if (!recipient.address) {
        throw new Error(`Missing address for recipient at index ${index}`);
      }
      if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(recipient.address)) {
        throw new Error(`Invalid Solana address format at index ${index}: ${recipient.address}`);
      }
    });
  }
}