require('dotenv').config();
const xlsx = require('xlsx');
const mongoose = require('mongoose');
const Contacto = require('./src/models/Contact');
const Giro = require('./src/models/Giro');
const User = require('./src/models/User');

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/canaco';
const giroMap = new Map();

/**
 * Conecta a MongoDB y ejecuta la lógica de importación.
 */
async function connectAndImport() {
    try {
        await mongoose.connect(MONGO_URI);
        const propietarioId = await getDefaultOwner();
        await processExcel('./Grupos WhatsApp CANACOs.xlsx', propietarioId);
    } catch (error) {
        console.error(error);
    } finally {
        await mongoose.disconnect();
    }
}

/**
 * Obtiene el ID del usuario administrador por defecto de la base de datos.
 */
async function getDefaultOwner() {
    try {
        let admin = await User.findOne({ rol: 'admin' });
        if (!admin) {
            admin = await User.findOne({});
        }
        return admin ? admin._id : null;
    } catch (error) {
        console.error(error);
        return null;
    }
}

/**
 * Busca un giro comercial existente por su nombre o crea uno nuevo en la base de datos.
 */
async function getOrCreateGiroId(giroName, propietarioId) {
    if (!giroName) return null;
    const normalized = giroName.trim();
    const key = normalized.toLowerCase();
    if (giroMap.has(key)) {
        return giroMap.get(key);
    }
    try {
        let giroObj = await Giro.findOne({ nombre: { $regex: new RegExp(`^${normalized}$`, 'i') } });
        if (!giroObj) {
            giroObj = new Giro({
                nombre: normalized,
                propietario: propietarioId
            });
            await giroObj.save();
        }
        giroMap.set(key, giroObj._id);
        return giroObj._id;
    } catch (error) {
        console.error(error);
        return null;
    }
}

/**
 * Lee el archivo Excel y procesa cada fila de manera secuencial.
 */
async function processExcel(filePath, propietarioId) {
    try {
        const workbook = xlsx.readFile(filePath);
        const sheet = workbook.Sheets['Base de Datos Completa'] || workbook.Sheets[workbook.SheetNames[0]];
        const rows = xlsx.utils.sheet_to_json(sheet);

        const contactsToInsert = [];
        for (const row of rows) {
            const contactData = await mapRowToContact(row, propietarioId);
            if (contactData) {
                contactsToInsert.push(contactData);
            }
        }
        await saveContacts(contactsToInsert);
    } catch (error) {
        console.error(error);
    }
}

/**
 * Mapea y normaliza los campos de una fila del Excel al formato del modelo de Contacto.
 */
async function mapRowToContact(row, propietarioId) {
    const telRaw = row['Número'] || row['número'] || row['Numero'] || row['numero'];
    if (!telRaw) return null;

    const parseBoolean = (val) => {
        if (val === undefined || val === null) return false;
        if (typeof val === 'boolean') return val;
        const clean = String(val).trim().toLowerCase();
        return clean === 'true' || clean === 'si' || clean === 'sí' || clean === '1' || clean === 'verdadero';
    };

    const cleanTelefono = String(telRaw).replace(/\D/g, '');
    if (cleanTelefono.length < 10) return null;

    const baseTenDigits = cleanTelefono.slice(-10);
    const telefono = '52' + baseTenDigits;
    const identificadorMeta = '521' + baseTenDigits;

    const giroRaw = row['Giro'] || row['giro'] || row['GIRO'];
    const girosIds = [];
    if (giroRaw) {
        const girosNombres = String(giroRaw).split(',').map(g => g.trim()).filter(Boolean);
        for (const nombre of girosNombres) {
            const giroId = await getOrCreateGiroId(nombre, propietarioId);
            if (giroId) {
                girosIds.push(giroId);
            }
        }
    }

    return {
        telefono,
        identificadorMeta,
        nombre: row['Nombre'] || 'Sin Nombre',
        empresa: row['Empresa (CRM)'] || '',
        codigoPostal: row['C.P.'] || '',
        numEmpleados: parseInt(row['N° Empleados'] || row['Tamaño de Empresa']) || 0,
        afiliado: parseBoolean(row['AFILIACIÓN'] || row['afiliación'] || row['Afiliación']),
        siem: parseBoolean(row['SIEM'] || row['siem']),
        sucursal: parseBoolean(row['SUCURSALES'] || row['sucursales'] || row['Sucursales']),
        vigente: parseBoolean(row['VIGENTE'] || row['vigente']),
        genero: row['Género'] || row['género'] || row['Genero'] || row['genero'] || '',
        propietario: propietarioId,
        giro: girosIds,
        grupos: []
    };
}

/**
 * Guarda o actualiza los contactos individualmente para ejecutar sus hooks de Mongoose.
 */
async function saveContacts(contacts) {
    let successCount = 0;
    for (const data of contacts) {
        try {
            let contact = await Contacto.findOne({ telefono: data.telefono });
            if (!contact) {
                contact = new Contacto(data);
            } else {
                Object.assign(contact, data);
            }
            await contact.save();
            successCount++;
        } catch (err) {
            console.error(err);
        }
    }
    console.log(`Proceso finalizado. Contactos importados/actualizados con exito: ${successCount}`);
}

connectAndImport();
