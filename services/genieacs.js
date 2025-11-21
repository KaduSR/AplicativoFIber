/**
 * GenieACS Integration Service
 * Serviço para comunicação com GenieACS via API REST
 * Documentação: https://github.com/genieacs/genieacs/wiki/API-Reference
 */

const axios = require('axios');

class GenieACSService {
  constructor(baseUrl, username, password) {
    this.baseUrl = baseUrl;
    this.auth = username && password ? {
      username,
      password,
    } : null;
  }

  /**
   * Cria cabeçalhos para requisições
   */
  getHeaders() {
    const headers = {
      'Content-Type': 'application/json',
    };

    if (this.auth) {
      const token = Buffer.from(`${this.auth.username}:${this.auth.password}`).toString('base64');
      headers['Authorization'] = `Basic ${token}`;
    }

    return headers;
  }

  /**
   * Busca dispositivo por ID (serial number)
   */
  async getDevice(deviceId) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/devices/${encodeURIComponent(deviceId)}`,
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error) {
      console.error('Error getting device:', error.message);
      throw error;
    }
  }

  /**
   * Lista todos os dispositivos
   */
  async listDevices(query = {}) {
    try {
      const params = new URLSearchParams();
      if (query.filter) params.append('query', JSON.stringify(query.filter));
      if (query.projection) params.append('projection', query.projection);
      
      const response = await axios.get(
        `${this.baseUrl}/devices?${params.toString()}`,
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error) {
      console.error('Error listing devices:', error.message);
      throw error;
    }
  }

  /**
   * Obtém parâmetros específicos de um dispositivo
   */
  async getDeviceParameters(deviceId, parameters) {
    try {
      const device = await this.getDevice(deviceId);
      const result = {};

      for (const param of parameters) {
        const value = this.extractParameter(device, param);
        if (value !== undefined) {
          result[param] = value;
        }
      }

      return result;
    } catch (error) {
      console.error('Error getting device parameters:', error.message);
      throw error;
    }
  }

  /**
   * Extrai valor de parâmetro do objeto do dispositivo
   */
  extractParameter(device, path) {
    const keys = path.split('.');
    let value = device;

    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return undefined;
      }
    }

    // GenieACS retorna arrays com [valor, timestamp, tipo]
    if (Array.isArray(value) && value.length > 0) {
      return value[0]; // Retorna apenas o valor
    }

    return value;
  }

  /**
   * Obtém informações da ONT
   */
  async getONTInfo(deviceId) {
    const parameters = [
      'DeviceID.Manufacturer',
      'DeviceID.ModelName',
      'DeviceID.SerialNumber',
      'DeviceID.SoftwareVersion',
      'Device.DeviceInfo.UpTime',
      'Device.DeviceInfo.Temperature',
      'Device.Optical.Interface.1.OpticalSignalLevel',
      'Device.Optical.Interface.1.TransmitOpticalLevel',
    ];

    try {
      const params = await this.getDeviceParameters(deviceId, parameters);

      return {
        manufacturer: params['DeviceID.Manufacturer'] || 'Huawei',
        model: params['DeviceID.ModelName'] || 'Unknown',
        serialNumber: params['DeviceID.SerialNumber'] || deviceId,
        firmwareVersion: params['DeviceID.SoftwareVersion'] || 'Unknown',
        uptime: parseInt(params['Device.DeviceInfo.UpTime']) || 0,
        temperature: parseFloat(params['Device.DeviceInfo.Temperature']) || null,
        opticalPower: {
          rx: parseFloat(params['Device.Optical.Interface.1.OpticalSignalLevel']) || 0,
          tx: parseFloat(params['Device.Optical.Interface.1.TransmitOpticalLevel']) || 0,
        },
      };
    } catch (error) {
      console.error('Error getting ONT info:', error.message);
      throw error;
    }
  }

  /**
   * Lista dispositivos conectados à ONT
   */
  async getConnectedDevices(deviceId) {
    const parameters = [
      'Device.Hosts.Host',
      'Device.WiFi.AccessPoint.1.AssociatedDevice',
      'Device.WiFi.AccessPoint.2.AssociatedDevice',
    ];

    try {
      const device = await this.getDevice(deviceId);
      const devices = [];

      // Processa dispositivos Ethernet (Device.Hosts.Host)
      const hosts = this.extractParameter(device, 'Device.Hosts.Host');
      if (hosts && typeof hosts === 'object') {
        for (const [hostId, hostData] of Object.entries(hosts)) {
          if (hostData && typeof hostData === 'object') {
            const active = this.extractParameter(hostData, 'Active');
            if (active) {
              devices.push({
                id: hostId,
                name: this.extractParameter(hostData, 'HostName') || `Device-${hostId}`,
                ipAddress: this.extractParameter(hostData, 'IPAddress') || '',
                macAddress: this.extractParameter(hostData, 'PhysAddress') || '',
                connectionType: 'ethernet',
                connected: active === 'true' || active === true,
                manufacturer: this.extractParameter(hostData, 'Manufacturer') || null,
              });
            }
          }
        }
      }

      // Processa dispositivos WiFi
      for (let apIndex = 1; apIndex <= 2; apIndex++) {
        const wifiDevices = this.extractParameter(device, `Device.WiFi.AccessPoint.${apIndex}.AssociatedDevice`);
        
        if (wifiDevices && typeof wifiDevices === 'object') {
          for (const [wifiId, wifiData] of Object.entries(wifiDevices)) {
            if (wifiData && typeof wifiData === 'object') {
              const macAddress = this.extractParameter(wifiData, 'MACAddress');
              if (macAddress) {
                devices.push({
                  id: `wifi-${apIndex}-${wifiId}`,
                  name: this.extractParameter(wifiData, 'HostName') || `WiFi-Device-${wifiId}`,
                  ipAddress: this.extractParameter(wifiData, 'IPAddress') || '',
                  macAddress,
                  connectionType: 'wifi',
                  connected: true,
                  signalStrength: this.calculateSignalStrength(
                    this.extractParameter(wifiData, 'SignalStrength')
                  ),
                  bandwidth: {
                    download: parseFloat(this.extractParameter(wifiData, 'LastDataDownlinkRate')) / 1000 || 0,
                    upload: parseFloat(this.extractParameter(wifiData, 'LastDataUplinkRate')) / 1000 || 0,
                  },
                });
              }
            }
          }
        }
      }

      return devices;
    } catch (error) {
      console.error('Error getting connected devices:', error.message);
      throw error;
    }
  }

  /**
   * Calcula porcentagem do sinal WiFi (converte dBm para %)
   */
  calculateSignalStrength(signalDbm) {
    if (!signalDbm) return null;
    
    const dbm = parseFloat(signalDbm);
    
    // Conversão aproximada de dBm para porcentagem
    // -30 dBm = 100% (excelente)
    // -67 dBm = 50% (médio)
    // -90 dBm = 0% (muito fraco)
    
    if (dbm >= -30) return 100;
    if (dbm <= -90) return 0;
    
    return Math.round(((dbm + 90) / 60) * 100);
  }

  /**
   * Executa tarefa no dispositivo
   */
  async executeTask(deviceId, taskName, taskParams = {}) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/devices/${encodeURIComponent(deviceId)}/tasks`,
        {
          name: taskName,
          ...taskParams,
        },
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error) {
      console.error('Error executing task:', error.message);
      throw error;
    }
  }

  /**
   * Define valor de parâmetro
   */
  async setParameter(deviceId, parameter, value) {
    return this.executeTask(deviceId, 'setParameterValues', {
      parameterValues: [[parameter, value, 'xsd:string']],
    });
  }

  /**
   * Bloqueia/desbloqueia dispositivo WiFi
   */
  async toggleDeviceBlock(deviceId, macAddress, block) {
    try {
      // Primeiro, encontra o índice do dispositivo associado
      const device = await this.getDevice(deviceId);
      
      // Procura em ambos os Access Points
      for (let apIndex = 1; apIndex <= 2; apIndex++) {
        const wifiDevices = this.extractParameter(device, `Device.WiFi.AccessPoint.${apIndex}.AssociatedDevice`);
        
        if (wifiDevices && typeof wifiDevices === 'object') {
          for (const [wifiId, wifiData] of Object.entries(wifiDevices)) {
            const deviceMac = this.extractParameter(wifiData, 'MACAddress');
            if (deviceMac === macAddress) {
              // Encontrou o dispositivo, agora bloqueia/desbloqueia
              const parameter = `Device.WiFi.AccessPoint.${apIndex}.AssociatedDevice.${wifiId}.Block`;
              await this.setParameter(deviceId, parameter, block.toString());
              return true;
            }
          }
        }
      }

      throw new Error('Device not found');
    } catch (error) {
      console.error('Error toggling device block:', error.message);
      throw error;
    }
  }

  /**
   * Reinicia a ONT
   */
  async rebootDevice(deviceId) {
    return this.executeTask(deviceId, 'reboot');
  }

  /**
   * Atualiza firmware da ONT
   */
  async upgradeFirmware(deviceId, firmwareUrl) {
    return this.executeTask(deviceId, 'download', {
      fileType: '1 Firmware Upgrade Image',
      url: firmwareUrl,
    });
  }

  /**
   * Força refresh dos parâmetros do dispositivo
   */
  async refreshDevice(deviceId) {
    return this.executeTask(deviceId, 'refreshObject', {
      objectName: 'Device.',
    });
  }
}

module.exports = GenieACSService;
