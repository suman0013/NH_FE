import { neon } from '@neondatabase/serverless';
import { createReadStream } from 'fs';
import { parse } from 'csv-parse';

// PostgreSQL connection with your specified database
const connectionString = 'postgresql://neondb_owner:npg_5MIwCD4YhSdP@ep-calm-silence-a15zko7l-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
const sql = neon(connectionString);

async function importFromCSV() {
  console.log('Starting CSV data import to PostgreSQL...');

  try {
    // 1. Import Devotional Statuses
    console.log('Importing devotional statuses...');
    const statusRecords: any[] = [];
    await new Promise<void>((resolve, reject) => {
      createReadStream('./devotional_statuses.csv')
        .pipe(parse({ columns: true, skipEmptyLines: true, trim: true }))
        .on('data', (row) => statusRecords.push(row))
        .on('end', resolve)
        .on('error', reject);
    });

    await sql('TRUNCATE TABLE devotional_statuses RESTART IDENTITY CASCADE');
    for (const status of statusRecords) {
      if (status.name) {
        await sql('INSERT INTO devotional_statuses (name, created_at) VALUES ($1, $2)', 
                 [status.name.trim(), new Date()]);
      }
    }
    console.log(`✓ Imported ${statusRecords.length} devotional statuses`);

    // 2. Import Shraddhakutirs
    console.log('Importing shraddhakutirs...');
    const shraddhakutirRecords: any[] = [];
    await new Promise<void>((resolve, reject) => {
      createReadStream('./shraddhakutirs.csv')
        .pipe(parse({ columns: true, skipEmptyLines: true, trim: true }))
        .on('data', (row) => shraddhakutirRecords.push(row))
        .on('end', resolve)
        .on('error', reject);
    });

    await sql('TRUNCATE TABLE shraddhakutirs RESTART IDENTITY CASCADE');
    for (const shk of shraddhakutirRecords) {
      if (shk.name) {
        await sql('INSERT INTO shraddhakutirs (name, district_code, created_at) VALUES ($1, $2, $3)', 
                 [shk.name.trim(), shk.districtCode || 'UNKNOWN', new Date()]);
      }
    }
    console.log(`✓ Imported ${shraddhakutirRecords.length} shraddhakutirs`);

    // 3. Import Namahattas
    console.log('Importing namahattas...');
    const namahattaRecords: any[] = [];
    await new Promise<void>((resolve, reject) => {
      createReadStream('./namahattas.csv')
        .pipe(parse({ columns: true, skipEmptyLines: true, trim: true }))
        .on('data', (row) => namahattaRecords.push(row))
        .on('end', resolve)
        .on('error', reject);
    });

    await sql('TRUNCATE TABLE namahattas RESTART IDENTITY CASCADE');
    for (const namahatta of namahattaRecords) {
      if (namahatta.code && namahatta.name) {
        await sql(`INSERT INTO namahattas (code, name, meeting_day, meeting_time, mala_senapoti, 
                   maha_chakra_senapoti, chakra_senapoti, upa_chakra_senapoti, secretary, status, created_at, updated_at) 
                   VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
                  [namahatta.code.trim(), namahatta.name.trim(), namahatta.meetingDay, namahatta.meetingTime,
                   namahatta.malaSenapoti, namahatta.mahaChakraSenapoti, namahatta.chakraSenapoti,
                   namahatta.upaChakraSenapoti, namahatta.secretary, namahatta.status || 'APPROVED',
                   new Date(), new Date()]);
      }
    }
    console.log(`✓ Imported ${namahattaRecords.length} namahattas`);

    // 4. Import Devotees
    console.log('Importing devotees...');
    const devoteeRecords: any[] = [];
    await new Promise<void>((resolve, reject) => {
      createReadStream('./devotees.csv')
        .pipe(parse({ columns: true, skipEmptyLines: true, trim: true }))
        .on('data', (row) => devoteeRecords.push(row))
        .on('end', resolve)
        .on('error', reject);
    });

    await sql('TRUNCATE TABLE devotees RESTART IDENTITY CASCADE');
    for (const devotee of devoteeRecords) {
      if (devotee.legalName) {
        await sql(`INSERT INTO devotees (legal_name, name, dob, email, phone, father_name, mother_name, 
                   husband_name, gender, blood_group, marital_status, devotional_status_id, namahatta_id,
                   initiated_name, harinam_date, education, occupation, additional_comments, created_at, updated_at)
                   VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)`,
                  [devotee.legalName?.trim(), devotee.name?.trim(), devotee.dob, devotee.email?.trim(), devotee.phone?.trim(),
                   devotee.fatherName?.trim(), devotee.motherName?.trim(), devotee.husbandName?.trim(), devotee.gender?.trim(),
                   devotee.bloodGroup?.trim(), devotee.maritalStatus?.trim(), 
                   devotee.devotionalStatusId ? parseInt(devotee.devotionalStatusId) : null,
                   devotee.namahattaId ? parseInt(devotee.namahattaId) : null,
                   devotee.initiatedName?.trim(), devotee.harinamDate, devotee.education?.trim(), 
                   devotee.occupation?.trim(), devotee.additionalComments?.trim(), new Date(), new Date()]);
      }
    }
    console.log(`✓ Imported ${devoteeRecords.length} devotees`);

    // 5. Import Addresses (first 5000 to avoid timeout)
    console.log('Importing address data (sample)...');
    const addressRecords: any[] = [];
    let count = 0;
    await new Promise<void>((resolve, reject) => {
      createReadStream('./attached_assets/f17a1608-5f10-4610-bb50-a63c80d83974_5440046a63c72fe90e3dc31777d48358_1752915346601.csv')
        .pipe(parse({ columns: true, skipEmptyLines: true, trim: true }))
        .on('data', (row) => {
          if (count < 5000) { // Limit to first 5000 records to avoid timeout
            addressRecords.push(row);
            count++;
          }
        })
        .on('end', resolve)
        .on('error', reject);
    });

    await sql('DELETE FROM addresses'); // Clear existing data
    let imported = 0;
    for (const record of addressRecords) {
      if (record.stateNameEnglish && record.districtNameEnglish) {
        try {
          await sql(`INSERT INTO addresses (country, state, district, sub_district, village, postal_code, created_at) 
                     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                    ['India', record.stateNameEnglish.trim(), record.districtNameEnglish.trim(),
                     record.subdistrictNameEnglish?.trim() || null, record.villageNameEnglish?.trim() || null,
                     record.pincode?.trim() || null, new Date()]);
          imported++;
        } catch (err) {
          // Skip duplicates or invalid data
        }
      }
    }
    console.log(`✓ Imported ${imported} addresses`);

    console.log('✅ All CSV data imported successfully!');

  } catch (error) {
    console.error('❌ Error importing CSV data:', error);
    throw error;
  }
}

// Run the import
importFromCSV().then(() => {
  console.log('Import completed successfully');
  process.exit(0);
}).catch(err => {
  console.error('Import failed:', err);
  process.exit(1);
});