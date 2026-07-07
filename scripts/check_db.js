const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const Mensaje = require('../src/models/Message');

async function check() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Conectado a MongoDB');

    const mensajes = await Mensaje.find({ tipo: 'button' }).sort({ createdAt: -1 }).limit(10);
    console.log('Últimos 10 mensajes tipo button:');
    mensajes.forEach(m => {
      console.log(`ID: ${m._id} | Dir: ${m.direccion} | Estado: ${m.estado} | Contenido: "${m.contenido}"`);
    });
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

check();
