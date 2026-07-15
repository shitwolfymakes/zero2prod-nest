import 'reflect-metadata';

// Skip the Testcontainers "ryuk" reaper: each suite stops its own container in
// afterAll, and disabling it avoids pulling an extra image.
process.env.TESTCONTAINERS_RYUK_DISABLED = 'true';
