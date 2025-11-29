import Database from 'better-sqlite3';
import { neon } from '@neondatabase/serverless';

// Check if SQLite database exists
import { existsSync } from 'fs';

const sqliteFile = './namahatta.db';
if (!existsSync(sqliteFile)) {
  console.log('SQLite database not found. Skipping migration.');
  process.exit(0);
}

// SQLite connection
const sqlite = new Database(sqliteFile);

// PostgreSQL connection
const connectionString = 'postgresql://neondb_owner:npg_5MIwCD4YhSdP@ep-calm-silence-a15zko7l-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
const sql = neon(connectionString);

async function migrateData() {
  console.log('Starting data migration from SQLite to PostgreSQL...');

  try {
    // 1. Migrate devotional statuses
    console.log('Migrating devotional statuses...');
    const statuses = sqlite.prepare('SELECT * FROM devotional_statuses').all();
    await sql('TRUNCATE TABLE devotional_statuses RESTART IDENTITY CASCADE');
    
    for (const status of statuses) {
      await sql(`INSERT INTO devotional_statuses (name, created_at) VALUES ($1, $2)`,
                [status.name, new Date()]);
    }
    console.log(`✓ Migrated ${statuses.length} devotional statuses`);

    // 2. Migrate shraddhakutirs
    console.log('Migrating shraddhakutirs...');
    const shraddhakutirs = sqlite.prepare('SELECT * FROM shraddhakutirs').all();
    await sql('TRUNCATE TABLE shraddhakutirs RESTART IDENTITY CASCADE');
    
    for (const shk of shraddhakutirs) {
      await sql(`INSERT INTO shraddhakutirs (name, district_code, created_at) VALUES ($1, $2, $3)`,
                [shk.name, shk.district_code || 'UNKNOWN', new Date()]);
    }
    console.log(`✓ Migrated ${shraddhakutirs.length} shraddhakutirs`);

    // 3. Migrate namahattas
    console.log('Migrating namahattas...');
    const namahattas = sqlite.prepare('SELECT * FROM namahattas').all();
    await sql('TRUNCATE TABLE namahattas RESTART IDENTITY CASCADE');
    
    for (const namahatta of namahattas) {
      await sql(`INSERT INTO namahattas (code, name, meeting_day, meeting_time, mala_senapoti, 
                 maha_chakra_senapoti, chakra_senapoti, upa_chakra_senapoti, secretary, status, created_at, updated_at) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
                [namahatta.code, namahatta.name, namahatta.meeting_day, namahatta.meeting_time,
                 namahatta.mala_senapoti, namahatta.maha_chakra_senapoti, namahatta.chakra_senapoti,
                 namahatta.upa_chakra_senapoti, namahatta.secretary, namahatta.status || 'APPROVED',
                 new Date(), new Date()]);
    }
    console.log(`✓ Migrated ${namahattas.length} namahattas`);

    // 4. Migrate devotees
    console.log('Migrating devotees...');
    const devotees = sqlite.prepare('SELECT * FROM devotees').all();
    await sql('TRUNCATE TABLE devotees RESTART IDENTITY CASCADE');
    
    for (const devotee of devotees) {
      await sql(`INSERT INTO devotees (legal_name, name, dob, email, phone, father_name, mother_name, 
                 husband_name, gender, blood_group, marital_status, devotional_status_id, namahatta_id,
                 gurudev_harinam, gurudev_pancharatrik, harinam_initiation_gurudev, pancharatrik_initiation_gurudev,
                 initiated_name, harinam_date, pancharatrik_date, education, occupation, devotional_courses,
                 additional_comments, shraddhakutir_id, created_at, updated_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27)`,
                [devotee.legal_name, devotee.name, devotee.dob, devotee.email, devotee.phone,
                 devotee.father_name, devotee.mother_name, devotee.husband_name, devotee.gender,
                 devotee.blood_group, devotee.marital_status, devotee.devotional_status_id,
                 devotee.namahatta_id, devotee.gurudev_harinam, devotee.gurudev_pancharatrik,
                 devotee.harinam_initiation_gurudev, devotee.pancharatrik_initiation_gurudev,
                 devotee.initiated_name, devotee.harinam_date, devotee.pancharatrik_date,
                 devotee.education, devotee.occupation, 
                 devotee.devotional_courses ? JSON.stringify(JSON.parse(devotee.devotional_courses)) : null,
                 devotee.additional_comments, devotee.shraddhakutir_id, new Date(), new Date()]);
    }
    console.log(`✓ Migrated ${devotees.length} devotees`);

    // 5. Migrate leaders
    console.log('Migrating leaders...');
    const leaders = sqlite.prepare('SELECT * FROM leaders').all();
    await sql('TRUNCATE TABLE leaders RESTART IDENTITY CASCADE');
    
    for (const leader of leaders) {
      await sql(`INSERT INTO leaders (name, role, reporting_to, location, created_at) VALUES ($1, $2, $3, $4, $5)`,
                [leader.name, leader.role, leader.reporting_to, 
                 leader.location ? JSON.stringify(JSON.parse(leader.location)) : null, new Date()]);
    }
    console.log(`✓ Migrated ${leaders.length} leaders`);

    // 6. Migrate SQLite addresses (for devotee/namahatta addresses)
    console.log('Migrating SQLite addresses...');
    const sqliteAddresses = sqlite.prepare('SELECT * FROM addresses').all();
    
    // Map old addresses to new IDs
    const addressMapping = new Map();
    
    for (const addr of sqliteAddresses) {
      const result = await sql(`INSERT INTO addresses (country, state, district, sub_district, village, postal_code, created_at) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
                [addr.country, addr.state, addr.district, addr.sub_district, addr.village, addr.postal_code, new Date()]);
      addressMapping.set(addr.id, result[0].id);
    }
    console.log(`✓ Migrated ${sqliteAddresses.length} SQLite addresses`);

    // 7. Migrate devotee addresses
    console.log('Migrating devotee addresses...');
    const devoteeAddresses = sqlite.prepare('SELECT * FROM devotee_addresses').all();
    await sql('TRUNCATE TABLE devotee_addresses RESTART IDENTITY CASCADE');
    
    for (const devAddr of devoteeAddresses) {
      const newAddressId = addressMapping.get(devAddr.address_id);
      if (newAddressId) {
        await sql(`INSERT INTO devotee_addresses (devotee_id, address_id, address_type, landmark, created_at) 
                   VALUES ($1, $2, $3, $4, $5)`,
                  [devAddr.devotee_id, newAddressId, devAddr.address_type, devAddr.landmark, new Date()]);
      }
    }
    console.log(`✓ Migrated ${devoteeAddresses.length} devotee addresses`);

    // 8. Migrate namahatta addresses
    console.log('Migrating namahatta addresses...');
    const namahattaAddresses = sqlite.prepare('SELECT * FROM namahatta_addresses').all();
    await sql('TRUNCATE TABLE namahatta_addresses RESTART IDENTITY CASCADE');
    
    for (const namAddr of namahattaAddresses) {
      const newAddressId = addressMapping.get(namAddr.address_id);
      if (newAddressId) {
        await sql(`INSERT INTO namahatta_addresses (namahatta_id, address_id, landmark, created_at) 
                   VALUES ($1, $2, $3, $4)`,
                  [namAddr.namahatta_id, newAddressId, namAddr.landmark, new Date()]);
      }
    }
    console.log(`✓ Migrated ${namahattaAddresses.length} namahatta addresses`);

    // 9. Migrate status history
    console.log('Migrating status history...');
    const statusHistory = sqlite.prepare('SELECT * FROM status_history').all();
    await sql('TRUNCATE TABLE status_history RESTART IDENTITY CASCADE');
    
    for (const history of statusHistory) {
      await sql(`INSERT INTO status_history (devotee_id, previous_status, new_status, updated_at, comment) 
                 VALUES ($1, $2, $3, $4, $5)`,
                [history.devotee_id, history.previous_status, history.new_status, new Date(), history.comment]);
    }
    console.log(`✓ Migrated ${statusHistory.length} status history records`);

    // 10. Migrate namahatta updates
    console.log('Migrating namahatta updates...');
    const namahattaUpdates = sqlite.prepare('SELECT * FROM namahatta_updates').all();
    await sql('TRUNCATE TABLE namahatta_updates RESTART IDENTITY CASCADE');
    
    for (const update of namahattaUpdates) {
      await sql(`INSERT INTO namahatta_updates (namahatta_id, program_type, date, attendance, prasad_distribution,
                 nagar_kirtan, book_distribution, chanting, arati, bhagwat_path, image_urls, facebook_link,
                 youtube_link, special_attraction, created_at) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
                [update.namahatta_id, update.program_type, update.date, update.attendance, update.prasad_distribution,
                 update.nagar_kirtan, update.book_distribution, update.chanting, update.arati, update.bhagwat_path,
                 update.image_urls ? JSON.stringify(JSON.parse(update.image_urls)) : null,
                 update.facebook_link, update.youtube_link, update.special_attraction, new Date()]);
    }
    console.log(`✓ Migrated ${namahattaUpdates.length} namahatta updates`);

    console.log('✅ Data migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    sqlite.close();
  }
}

// Run migration
migrateData().then(() => {
  console.log('Migration script finished.');
  process.exit(0);
}).catch((error) => {
  console.error('Migration script failed:', error);
  process.exit(1);
});