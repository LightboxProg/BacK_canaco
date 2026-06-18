const mongoose = require('mongoose');
require('dotenv').config();
const Contacto = require('../src/models/Contact');
const Grupo = require('../src/models/Group');
const Giro = require('../src/models/Giro');
const User = require('../src/models/User');

/**
 * Script para poblar la base de datos con datos iniciales de prueba.
 * Registra 3 giros, 3 grupos y 5 contactos con asociaciones.
 */
async function seedData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/canaco');
    console.log('Conectado a MongoDB...');

    // Limpiar datos existentes (opcional, comentar si no se desea)
    await Contacto.deleteMany({});
    await Grupo.deleteMany({});
    await Giro.deleteMany({});
    console.log('Colecciones limpias.');

    // Obtener un usuario para asignar como propietario (usualmente el admin)
    let admin = await User.findOne({ rol: 'admin' });
    if (!admin) {
      // Si no hay admin, buscar cualquier usuario o crear uno temporal
      admin = await User.findOne({});
    }

    if (!admin) {
      console.log('Error: No se encontró un usuario en la base de datos para asignar los registros.');
      process.exit(1);
    }

    // 1. Crear 3 Giros
    const girosData = [
      { nombre: 'Tecnología', descripcion: 'Empresas de software y hardware' },
      { nombre: 'Restaurantes', descripcion: 'Servicios de comida y bebidas' },
      { nombre: 'Comercio', descripcion: 'Venta de productos al por menor' }
    ];
    const giros = await Giro.insertMany(girosData);
    console.log('3 Giros creados.');

    // 2. Crear 3 Grupos
    const gruposData = [
      { nombre: 'Afiliados Premium', descripcion: 'Contactos con membresía oro', propietario: admin._id },
      { nombre: 'Prospectos 2024', descripcion: 'Posibles nuevos socios', propietario: admin._id },
      { nombre: 'Zona Centro', descripcion: 'Contactos ubicados en el centro', propietario: admin._id }
    ];
    const grupos = await Grupo.insertMany(gruposData);
    console.log('3 Grupos creados.');

    // 3. Crear 5 Contactos con asociaciones
    const contactosData = [
      {
        telefono: '5215512345671',
        nombre: 'Juan Perez',
        empresa: 'Tech Solutions',
        propietario: admin._id,
        giro: [giros[0]._id],
        grupos: [grupos[0]._id, grupos[2]._id],
        registrado: true
      },
      {
        telefono: '5215512345672',
        nombre: 'Maria Garcia',
        empresa: 'La Parrilla',
        propietario: admin._id,
        giro: [giros[1]._id],
        grupos: [grupos[0]._id],
        registrado: true
      },
      {
        telefono: '5215512345673',
        nombre: 'Carlos Lopez',
        empresa: 'Mega Store',
        propietario: admin._id,
        giro: [giros[2]._id],
        grupos: [grupos[1]._id, grupos[2]._id],
        registrado: true
      },
      {
        telefono: '5215512345674',
        nombre: 'Ana Martinez',
        empresa: 'Soft Dev',
        propietario: admin._id,
        giro: [giros[0]._id],
        grupos: [grupos[0]._id, grupos[1]._id],
        registrado: true
      },
      {
        telefono: '5215512345675',
        nombre: 'Luis Rodriguez',
        empresa: 'El Gourmet',
        propietario: admin._id,
        giro: [giros[1]._id, giros[2]._id],
        grupos: [grupos[2]._id],
        registrado: true
      }
    ];

    await Contacto.insertMany(contactosData);
    console.log('5 Contactos creados con sus respectivas asociaciones.');

    console.log('Seed finalizado con éxito.');
    process.exit(0);
  } catch (error) {
    console.error('Error durante el seed:', error);
    process.exit(1);
  }
}

seedData();
