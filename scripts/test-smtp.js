require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const nodemailer = require('nodemailer');
const entorno = require('../src/config/environment');

const crearTransportador = () => {
  return nodemailer.createTransport({
    host: entorno.SMTP_HOST,
    port: parseInt(entorno.SMTP_PORT || '587', 10),
    secure: entorno.SMTP_PORT === '465',
    auth: {
      user: entorno.SMTP_USER,
      pass: entorno.SMTP_PASS,
    },
  });
};

async function testSMTP() {
  console.log('Iniciando prueba de SMTP...');
  console.log('Host:', entorno.SMTP_HOST);
  console.log('Port:', entorno.SMTP_PORT);
  console.log('User:', entorno.SMTP_USER);

  if (!entorno.SMTP_USER || !entorno.SMTP_PASS) {
    console.error('Error: Las credenciales SMTP_USER o SMTP_PASS no están configuradas.');
    process.exit(1);
  }

  const transportador = crearTransportador();

  try {
    console.log('Verificando conexión con el servidor SMTP...');
    await transportador.verify();
    console.log('Conexión verifacada con éxito.');

    const opcionesCorreo = {
      from: `"Prueba Soporte" <${entorno.SMTP_USER}>`,
      to: 'luisen.perezgonzalez@gmail.com',
      subject: 'Prueba de conexión SMTP',
      text: 'Si recibes este correo, la configuración SMTP es correcta.',
      html: '<h1>Prueba de conexión SMTP</h1><p>Si recibes este correo, la configuración SMTP es correcta.</p>',
    };

    console.log('Enviando correo de prueba a: luisen.perezgonzalez@gmail.com');
    const info = await transportador.sendMail(opcionesCorreo);
    console.log('Correo enviado con éxito. ID del mensaje:', info.messageId);
  } catch (error) {
    console.error('Error al probar el SMTP:', error);
  }
}

testSMTP();
