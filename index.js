const express = require('express');
const sql = require('mssql');
const cors = require('cors');  
require('dotenv').config();

const app = express();
const port = process.env.PORT || 8080;

// Middleware para permitir solicitudes JSON y CORS
app.use(express.json());
app.use(cors({
    origin: 'https://mi-api-adherentes-b6ezbvgkc0buancp.brazilsouth-01.azurewebsites.net', // Cambia esto a tu URL de ngrok
}));

// Configuración de la conexión a la base de datos
const config = {
    server: process.env.DB_SERVER,
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT),  
    options: {
        encrypt: true,
        trustServerCertificate: true,
        enableArithAbort: true,
        requestTimeout: 30000 // 30 segundos de timeout
    },
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD
};

// Aumentar el tiempo de espera del cliente de la base de datos
const poolPromise = sql.connect(config).then(pool => {
    console.log('Conexión exitosa a la base de datos');
    return pool;
}).catch(err => {
    console.error('Error al conectar a la base de datos:', err.message);
    process.exit(1);
});

// Endpoint para obtener información de una persona por DNI
app.get('/api/adherente/:dni', async (req, res) => {
    const { dni } = req.params;
    console.log('DNI recibido:', dni);

    const dniInt = parseInt(dni);
    if (!dniInt || dniInt < 1000000) {
        console.log('DNI inválido:', dni);
        return res.status(400).json({ message: 'DNI inválido' });
    }

    try {
        const pool = await poolPromise;
        console.log('Conexión a la base de datos exitosa');

        // Ejecutar la consulta SQL
        const result = await pool.request()
            .input('dni', sql.Int, dniInt)
            .query('SELECT * FROM Seccion8 WHERE DNI = @dni');

        console.log('Resultado de la consulta SQL:', result.recordset);

        // Verifica si se encontraron registros
        if (result.recordset.length === 0) {
            console.log(`No se encontró el adherente con DNI: ${dniInt}`);
            return res.status(404).json({ message: 'No se encontró el adherente' });
        }

        const adherente = result.recordset[0];
        console.log('Adherente encontrado:', adherente);

        // Depuración final antes de enviar la respuesta
        console.log('Enviando respuesta:', JSON.stringify(adherente));

        // Respuesta con los datos del adherente
        return res.json({
            nombre: adherente.NOMBRE,
            apellido: adherente.APELLIDO,
            domicilio: adherente.DOMICILIO,
            localidad: adherente.LOCALIDAD,
            circuito: adherente.CIRCUITO,
            
        });
        
    } catch (err) {
        console.error('Error al ejecutar la consulta SQL:', err.message);
        return res.status(500).json({ message: 'Error interno del servidor' });
    }
});



// Iniciar el servidor
app.listen(port, () => {
    console.log(`Servidor escuchando en el puerto ${port}`);
});
