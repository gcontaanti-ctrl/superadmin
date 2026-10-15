const { exec } = require('child_process');

// Try to restart the service by display name
exec('sc query "cybertechgestaoapi"', (err, stdout) => {
  if (stdout && stdout.includes('SERVICE_NAME')) {
    console.log('Found service, restarting...');
    exec('sc stop "cybertechgestaoapi"', (e1, o1) => {
      console.log('Stop:', o1 || e1);
      setTimeout(() => {
        exec('sc start "cybertechgestaoapi"', (e2, o2) => {
          console.log('Start:', o2 || e2);
        });
      }, 3000);
    });
  } else {
    // Try with spaces
    exec('sc query "Cybertech Gestao API"', (err2, stdout2) => {
      console.log('Query result:', stdout2 || err2);
    });
    // Also try listing all node-windows services
    exec('wmic service where "pathname like \'%CybertechGestao%\'" get name,state,pathname', (e3, o3) => {
      console.log('WMIC result:', o3 || e3);
    });
  }
});
