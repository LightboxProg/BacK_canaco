require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const entorno = require('../src/config/environment');
const Usuario = require('../src/models/User');

/** Inserta un usuario Administrador confirmado en la base de datos. */
async function seedAdmin() {
  try {
    await mongoose.connect(entorno.MONGODB_URI);
    console.log('Conectado a MongoDB');

    const correo = 'levm32.gr@gmail.com';
    const existente = await Usuario.findOne({ correo });

    if (existente) {
      console.log('El usuario administrador ya existe, omitiendo creacion.');
      await mongoose.disconnect();
      return;
    }

    await Usuario.create({
      nombre: 'Administrador',
      correo,
      contrasena: 'Admin1234',
      rol: 'admin',
      confirmado: true
    });

    console.log('Usuario Administrador creado exitosamente.');
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error al crear el usuario administrador:', error.message);
    await mongoose.disconnect();
    process.exit(1);
  }
}

seedAdmin();
