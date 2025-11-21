/**
 * ONT Routes
 * Rotas da API para gerenciamento de ONTs via GenieACS
 */

const express = require('express');
const router = express.Router();

/**
 * Middleware para validar API Key
 */
const validateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey || apiKey !== process.env.API_KEY) {
    return res.status(401).json({ error: 'Unauthorized: Invalid API key' });
  }
  
  next();
};

// Aplica validação em todas as rotas
router.use(validateApiKey);

/**
 * GET /api/ont/:serialNumber/info
 * Obtém informações da ONT
 */
router.get('/:serialNumber/info', async (req, res) => {
  try {
    const { serialNumber } = req.params;
    const genieacs = req.app.get('genieacs');

    const ontInfo = await genieacs.getONTInfo(serialNumber);
    
    res.json(ontInfo);
  } catch (error) {
    console.error('Error getting ONT info:', error);
    res.status(500).json({ 
      error: 'Failed to get ONT information',
      message: error.message,
    });
  }
});

/**
 * GET /api/ont/:serialNumber/devices
 * Lista dispositivos conectados à ONT
 */
router.get('/:serialNumber/devices', async (req, res) => {
  try {
    const { serialNumber } = req.params;
    const genieacs = req.app.get('genieacs');

    const devices = await genieacs.getConnectedDevices(serialNumber);
    
    res.json(devices);
  } catch (error) {
    console.error('Error getting connected devices:', error);
    res.status(500).json({ 
      error: 'Failed to get connected devices',
      message: error.message,
    });
  }
});

/**
 * POST /api/ont/:serialNumber/device/:macAddress/block
 * Bloqueia/desbloqueia dispositivo
 */
router.post('/:serialNumber/device/:macAddress/block', async (req, res) => {
  try {
    const { serialNumber, macAddress } = req.params;
    const { block } = req.body;
    const genieacs = req.app.get('genieacs');

    await genieacs.toggleDeviceBlock(serialNumber, macAddress, block);
    
    res.json({ 
      success: true,
      message: `Device ${block ? 'blocked' : 'unblocked'} successfully`,
    });
  } catch (error) {
    console.error('Error toggling device block:', error);
    res.status(500).json({ 
      error: 'Failed to block/unblock device',
      message: error.message,
    });
  }
});

/**
 * POST /api/ont/:serialNumber/reboot
 * Reinicia a ONT
 */
router.post('/:serialNumber/reboot', async (req, res) => {
  try {
    const { serialNumber } = req.params;
    const genieacs = req.app.get('genieacs');

    await genieacs.rebootDevice(serialNumber);
    
    res.json({ 
      success: true,
      message: 'ONT reboot initiated',
    });
  } catch (error) {
    console.error('Error rebooting ONT:', error);
    res.status(500).json({ 
      error: 'Failed to reboot ONT',
      message: error.message,
    });
  }
});

/**
 * POST /api/ont/:serialNumber/refresh
 * Força atualização dos dados da ONT
 */
router.post('/:serialNumber/refresh', async (req, res) => {
  try {
    const { serialNumber } = req.params;
    const genieacs = req.app.get('genieacs');

    await genieacs.refreshDevice(serialNumber);
    
    res.json({ 
      success: true,
      message: 'Device refresh initiated',
    });
  } catch (error) {
    console.error('Error refreshing device:', error);
    res.status(500).json({ 
      error: 'Failed to refresh device',
      message: error.message,
    });
  }
});

/**
 * GET /api/ont/list
 * Lista todas as ONTs gerenciadas
 */
router.get('/list', async (req, res) => {
  try {
    const genieacs = req.app.get('genieacs');
    const { manufacturer, model } = req.query;

    const filter = {};
    if (manufacturer) filter['DeviceID.Manufacturer'] = manufacturer;
    if (model) filter['DeviceID.ModelName'] = model;

    const devices = await genieacs.listDevices({ filter });
    
    res.json(devices);
  } catch (error) {
    console.error('Error listing ONTs:', error);
    res.status(500).json({ 
      error: 'Failed to list ONTs',
      message: error.message,
    });
  }
});

module.exports = router;
