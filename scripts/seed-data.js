const mongoose = require('mongoose');
require('dotenv').config();
const Contacto = require('../src/models/Contact');
const Mensaje = require('../src/models/Message');
const Grupo = require('../src/models/Group');
const Giro = require('../src/models/Giro');
const User = require('../src/models/User');

/**
 * Script para poblar la base de datos con datos iniciales de prueba.
 * Registra giros, grupos, contactos registrados, contactos no registrados y mensajes de ejemplo.
 */
async function seedData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/canaco');
    console.log('Conectado a MongoDB...');

    await Mensaje.deleteMany({});
    await Contacto.deleteMany({});
    await Grupo.deleteMany({});
    await Giro.deleteMany({});
    console.log('Colecciones limpias.');

    let admin = await User.findOne({ rol: 'admin' });
    if (!admin) {
      admin = await User.findOne({});
    }

    if (!admin) {
      console.log('Error: No se encontro un usuario en la base de datos para asignar los registros.');
      process.exit(1);
    }

    // 1. Crear Giros
    const girosData = [
      { nombre: 'Tecnologia', descripcion: 'Empresas de software y hardware' },
      { nombre: 'Restaurantes', descripcion: 'Servicios de comida y bebidas' },
      { nombre: 'Comercio', descripcion: 'Venta de productos al por menor' }
    ];
    const giros = await Giro.insertMany(girosData);
    console.log('3 Giros creados.');

    // 2. Crear Grupos
    const gruposData = [
      { nombre: 'Afiliados Premium', descripcion: 'Contactos con membresia oro', propietario: admin._id },
      { nombre: 'Prospectos 2024', descripcion: 'Posibles nuevos socios', propietario: admin._id },
      { nombre: 'Zona Centro', descripcion: 'Contactos ubicados en el centro', propietario: admin._id }
    ];
    const grupos = await Grupo.insertMany(gruposData);
    console.log('3 Grupos creados.');

    // 3. Contactos REGISTRADOS (con propietario)
    const contactosRegistrados = [
      {
        telefono: '525512345671',
        identificadorMeta: '5215512345671',
        nombre: 'Juan Perez',
        empresa: 'Tech Solutions',
        propietario: admin._id,
        giro: [giros[0]._id],
        grupos: [grupos[0]._id, grupos[2]._id],
        afiliado: true,
        vigente: true
      },
      {
        telefono: '525512345672',
        identificadorMeta: '5215512345672',
        nombre: 'Maria Garcia',
        empresa: 'La Parrilla',
        propietario: admin._id,
        giro: [giros[1]._id],
        grupos: [grupos[0]._id],
        afiliado: true,
        siem: true
      },
      {
        telefono: '525512345673',
        identificadorMeta: '5215512345673',
        nombre: 'Carlos Lopez',
        empresa: 'Mega Store',
        propietario: admin._id,
        giro: [giros[2]._id],
        grupos: [grupos[1]._id, grupos[2]._id],
        vigente: true
      }
    ];

    const registrados = await Contacto.insertMany(contactosRegistrados);
    console.log(`${registrados.length} Contactos registrados creados.`);

    // 4. Contactos NO REGISTRADOS (sin propietario, simulan mensajes entrantes de WhatsApp)
    const contactosNoRegistrados = [
      {
        telefono: '528112223344',
        identificadorMeta: '5218112223344',
        nombre: 'Desconocido'
      },
      {
        telefono: '528113334455',
        identificadorMeta: '5218113334455',
        nombre: 'Prospecto Nuevo'
      },
      {
        telefono: '528114445566',
        identificadorMeta: '5218114445566',
        nombre: 'Consulta General'
      }
    ];

    const noRegistrados = await Contacto.insertMany(contactosNoRegistrados);
    console.log(`${noRegistrados.length} Contactos no registrados creados.`);

    // 5. Crear mensajes de ejemplo
    const ahora = new Date();
    const mensajesData = [];

    // Mensajes para contactos registrados
    registrados.forEach((contacto, i) => {
      mensajesData.push({
        contacto: contacto._id,
        contenido: `Hola, soy ${contacto.nombre}. Necesito informacion.`,
        direccion: 'entrante',
        estado: 'entregado',
        tipo: 'texto',
        createdAt: new Date(ahora.getTime() - (30 - i) * 60000)
      });
      mensajesData.push({
        contacto: contacto._id,
        contenido: 'Buen dia, con gusto le ayudamos.',
        direccion: 'saliente',
        estado: 'leido',
        tipo: 'texto',
        remitenteUsuario: admin._id,
        createdAt: new Date(ahora.getTime() - (29 - i) * 60000)
      });
    });

    // Mensajes para contactos NO registrados
    noRegistrados.forEach((contacto, i) => {
      mensajesData.push({
        contacto: contacto._id,
        contenido: 'Hola, me gustaria recibir informacion sobre la afiliacion.',
        direccion: 'entrante',
        estado: 'entregado',
        tipo: 'texto',
        createdAt: new Date(ahora.getTime() - (20 - i * 5) * 60000)
      });
      mensajesData.push({
        contacto: contacto._id,
        contenido: 'Tienen horarios de atencion disponibles?',
        direccion: 'entrante',
        estado: 'entregado',
        tipo: 'texto',
        createdAt: new Date(ahora.getTime() - (18 - i * 5) * 60000)
      });
    });

    await Mensaje.insertMany(mensajesData);
    console.log(`${mensajesData.length} Mensajes de ejemplo creados.`);

    console.log('Seed finalizado con exito.');
    process.exit(0);
  } catch (error) {
    console.error('Error durante el seed:', error);
    process.exit(1);
  }
}

seedData();
