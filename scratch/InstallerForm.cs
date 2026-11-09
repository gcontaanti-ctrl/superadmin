using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.IO.Compression;
using System.Net;
using System.Net.NetworkInformation;
using System.Net.Sockets;
using System.Reflection;
using System.Security.Principal;
using System.Threading;
using System.Windows.Forms;

namespace SmartCybertechInstaller
{
    static class Program
    {
        [STAThread]
        static void Main()
        {
            if (!IsAdministrator())
            {
                try
                {
                    ProcessStartInfo psi = new ProcessStartInfo();
                    psi.FileName = Application.ExecutablePath;
                    psi.UseShellExecute = true;
                    psi.Verb = "runas";
                    Process.Start(psi);
                }
                catch { }
                return;
            }

            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new MainForm());
        }

        static bool IsAdministrator()
        {
            try
            {
                WindowsIdentity id = WindowsIdentity.GetCurrent();
                WindowsPrincipal principal = new WindowsPrincipal(id);
                return principal.IsInRole(WindowsBuiltInRole.Administrator);
            }
            catch
            {
                return false;
            }
        }
    }

    public class MainForm : Form
    {
        private ProgressBar progressBar;
        private Label lblStatus;
        private Label lblTitle;
        private Label lblSubtitle;
        private Button btnAction;
        private Button btnOpenBrowser;
        private RichTextBox txtLog;
        private string targetDir = @"C:\CybertechGestao";
        private string localIp = "127.0.0.1";

        public MainForm()
        {
            InitializeComponent();
            DetectLocalIp();
        }

        private void InitializeComponent()
        {
            this.Text = "SmartCybertech Gestão — Instalador do Servidor";
            this.Size = new Size(580, 480);
            this.FormBorderStyle = FormBorderStyle.FixedDialog;
            this.MaximizeBox = false;
            this.StartPosition = FormStartPosition.CenterScreen;
            this.BackColor = Color.FromArgb(10, 15, 29);
            this.ForeColor = Color.FromArgb(226, 232, 240);

            lblTitle = new Label();
            lblTitle.Text = "SMARTCYBERTECH GESTÃO";
            lblTitle.Font = new Font("Segoe UI", 16, FontStyle.Bold);
            lblTitle.ForeColor = Color.FromArgb(34, 211, 238);
            lblTitle.Location = new Point(24, 20);
            lblTitle.AutoSize = true;

            lblSubtitle = new Label();
            lblSubtitle.Text = "Instalador do Servidor de Rede, Painel Web e App Mobile";
            lblSubtitle.Font = new Font("Segoe UI", 9.5f, FontStyle.Regular);
            lblSubtitle.ForeColor = Color.FromArgb(148, 163, 184);
            lblSubtitle.Location = new Point(26, 52);
            lblSubtitle.AutoSize = true;

            progressBar = new ProgressBar();
            progressBar.Location = new Point(28, 90);
            progressBar.Size = new Size(508, 22);
            progressBar.Style = ProgressBarStyle.Continuous;
            progressBar.Value = 0;

            lblStatus = new Label();
            lblStatus.Text = "Pronto para instalar o sistema em C:\\CybertechGestao";
            lblStatus.Font = new Font("Segoe UI", 9, FontStyle.Bold);
            lblStatus.ForeColor = Color.FromArgb(203, 213, 225);
            lblStatus.Location = new Point(28, 120);
            lblStatus.Size = new Size(508, 20);

            txtLog = new RichTextBox();
            txtLog.Location = new Point(28, 148);
            txtLog.Size = new Size(508, 210);
            txtLog.BackColor = Color.FromArgb(15, 23, 42);
            txtLog.ForeColor = Color.FromArgb(148, 163, 184);
            txtLog.Font = new Font("Consolas", 8.5f, FontStyle.Regular);
            txtLog.BorderStyle = BorderStyle.None;
            txtLog.ReadOnly = true;

            btnAction = new Button();
            btnAction.Text = "INSTALAR SISTEMA AGORA ➔";
            btnAction.Font = new Font("Segoe UI", 10, FontStyle.Bold);
            btnAction.ForeColor = Color.Black;
            btnAction.BackColor = Color.FromArgb(6, 182, 212);
            btnAction.FlatStyle = FlatStyle.Flat;
            btnAction.FlatAppearance.BorderSize = 0;
            btnAction.Location = new Point(28, 375);
            btnAction.Size = new Size(240, 42);
            btnAction.Cursor = Cursors.Hand;
            btnAction.Click += BtnAction_Click;

            btnOpenBrowser = new Button();
            btnOpenBrowser.Text = "Abrir Sistema no Navegador";
            btnOpenBrowser.Font = new Font("Segoe UI", 9.5f, FontStyle.Bold);
            btnOpenBrowser.ForeColor = Color.White;
            btnOpenBrowser.BackColor = Color.FromArgb(30, 41, 59);
            btnOpenBrowser.FlatStyle = FlatStyle.Flat;
            btnOpenBrowser.FlatAppearance.BorderSize = 0;
            btnOpenBrowser.Location = new Point(280, 375);
            btnOpenBrowser.Size = new Size(256, 42);
            btnOpenBrowser.Cursor = Cursors.Hand;
            btnOpenBrowser.Visible = false;
            btnOpenBrowser.Click += (s, e) => {
                Process.Start("http://localhost:3001");
            };

            this.Controls.Add(lblTitle);
            this.Controls.Add(lblSubtitle);
            this.Controls.Add(progressBar);
            this.Controls.Add(lblStatus);
            this.Controls.Add(txtLog);
            this.Controls.Add(btnAction);
            this.Controls.Add(btnOpenBrowser);

            Log("Instalador iniciado com sucesso.");
            Log("Pasta de destino: " + targetDir);
        }

        private void DetectLocalIp()
        {
            try
            {
                string bestIp = null;
                bool bestIsDhcp = false;

                // Lista de nomes de adaptadores virtuais/VPN a ignorar (case-insensitive)
                string[] blacklist = new string[] {
                    "virtualbox", "vmware", "vmnet", "hyper-v", "vethernet",
                    "openvpn", "tap-windows", "wintun", "radmin", "hamachi",
                    "logmein", "bluetooth", "loopback", "teredo", "isatap",
                    "6to4", "pseudo"
                };

                foreach (NetworkInterface ni in NetworkInterface.GetAllNetworkInterfaces())
                {
                    // Somente interfaces ativas
                    if (ni.OperationalStatus != OperationalStatus.Up) continue;
                    // Somente Ethernet ou Wi-Fi
                    if (ni.NetworkInterfaceType == NetworkInterfaceType.Loopback) continue;
                    if (ni.NetworkInterfaceType == NetworkInterfaceType.Tunnel) continue;

                    // Verifica se o nome do adaptador contem termos de blacklist
                    string adapterName = ni.Name.ToLower() + " " + ni.Description.ToLower();
                    bool isBlacklisted = false;
                    foreach (string bl in blacklist)
                    {
                        if (adapterName.Contains(bl))
                        {
                            isBlacklisted = true;
                            break;
                        }
                    }
                    if (isBlacklisted)
                    {
                        Log("  [Ignorado] Adaptador virtual/VPN: " + ni.Name + " (" + ni.Description + ")");
                        continue;
                    }

                    IPInterfaceProperties props = ni.GetIPProperties();
                    foreach (UnicastIPAddressInformation addr in props.UnicastAddresses)
                    {
                        if (addr.Address.AddressFamily != AddressFamily.InterNetwork) continue;
                        string ip = addr.Address.ToString();
                        if (ip.StartsWith("127.") || ip.StartsWith("169.254.")) continue;

                        // Detecta se veio por DHCP
                        bool isDhcp = false;
                        try { isDhcp = props.GetIPv4Properties().IsDhcpEnabled; }
                        catch { }

                        Log("  [Encontrado] " + ip + " via " + ni.Name + (isDhcp ? " (DHCP)" : " (Manual)"));

                        // Prioriza DHCP sobre Manual
                        if (bestIp == null || (isDhcp && !bestIsDhcp))
                        {
                            bestIp = ip;
                            bestIsDhcp = isDhcp;
                        }
                    }
                }

                if (bestIp != null)
                {
                    localIp = bestIp;
                }

                Log(">>> IP da rede local selecionado: " + localIp + (bestIsDhcp ? " (DHCP - rede real)" : ""));
            }
            catch (Exception ex)
            {
                localIp = "127.0.0.1";
                Log("Erro detectando IP: " + ex.Message);
            }
        }

        private void Log(string msg)
        {
            if (this.InvokeRequired)
            {
                this.Invoke(new Action<string>(Log), msg);
                return;
            }
            txtLog.AppendText("[" + DateTime.Now.ToString("HH:mm:ss") + "] " + msg + Environment.NewLine);
            txtLog.SelectionStart = txtLog.Text.Length;
            txtLog.ScrollToCaret();
        }

        private void UpdateProgress(int val, string status)
        {
            if (this.InvokeRequired)
            {
                this.Invoke(new Action<int, string>(UpdateProgress), val, status);
                return;
            }
            progressBar.Value = Math.Min(100, Math.Max(0, val));
            lblStatus.Text = status;
        }

        private void BtnAction_Click(object sender, EventArgs e)
        {
            btnAction.Enabled = false;
            Thread t = new Thread(RunInstall);
            t.IsBackground = true;
            t.Start();
        }

        private void RunInstall()
        {
            try
            {
                UpdateProgress(10, "1/6 Parando servicos antigos...");
                Log("Parando servicos anteriores para liberar arquivos...");
                RunCmd("net stop \"cybertechgestaoapi.exe\" /y");
                RunCmd("net stop \"Cybertech Gestao API\" /y");
                RunCmd("sc stop \"cybertechgestaoapi\"");
                RunCmd("taskkill /f /im cybertechgestaoapi.exe");
                RunCmd("taskkill /f /im node.exe");
                Thread.Sleep(2000);

                UpdateProgress(25, "2/6 Extraindo arquivos do sistema...");
                Log("Extraindo arquivos para " + targetDir + "...");
                if (!Directory.Exists(targetDir)) Directory.CreateDirectory(targetDir);

                // Extrai pacote ZIP embutido
                Assembly asm = Assembly.GetExecutingAssembly();
                using (Stream s = asm.GetManifestResourceStream("PackageZip"))
                {
                    if (s == null)
                    {
                        throw new Exception("Recurso PackageZip nao encontrado no instalador!");
                    }
                    using (ZipArchive zip = new ZipArchive(s))
                    {
                        foreach (ZipArchiveEntry entry in zip.Entries)
                        {
                            string destPath = Path.Combine(targetDir, entry.FullName);
                            if (string.IsNullOrEmpty(entry.Name))
                            {
                                Directory.CreateDirectory(destPath);
                                continue;
                            }
                            string dir = Path.GetDirectoryName(destPath);
                            if (!Directory.Exists(dir)) Directory.CreateDirectory(dir);

                            // Preserva db-config.json existente
                            if (entry.FullName.Contains("db-config.json") && File.Exists(destPath))
                            {
                                Log("Preservando configuracao do banco DB2 existente...");
                                continue;
                            }

                            entry.ExtractToFile(destPath, true);
                        }
                    }
                }
                Log("Arquivos extraidos com sucesso.");

                UpdateProgress(50, "3/6 Configurando Firewall do Windows...");
                Log("Liberando portas 3001 e 8082 no Firewall...");
                RunCmd("netsh advfirewall firewall delete rule name=\"SmartCybertech 3001\"");
                RunCmd("netsh advfirewall firewall delete rule name=\"SmartCybertech 8082\"");
                RunCmd("netsh advfirewall firewall add rule name=\"SmartCybertech 3001\" dir=in action=allow protocol=TCP localport=3001");
                RunCmd("netsh advfirewall firewall add rule name=\"SmartCybertech 8082\" dir=in action=allow protocol=TCP localport=8082");

                UpdateProgress(65, "4/6 Registrando nome no Windows...");
                Log("Adicionando smartcybertech no arquivo hosts...");
                RegisterHosts();

                UpdateProgress(80, "5/6 Instalando Servico em segundo plano...");
                Log("Iniciando configuracao do servico Node.js...");
                RunCmd("cd /d \"" + targetDir + "\" && node install-service.js");
                Thread.Sleep(3000);

                // Garante inicialização
                RunCmd("net start \"cybertechgestaoapi.exe\"");

                UpdateProgress(95, "6/6 Criando atalhos na Area de Trabalho...");
                CreateShortcuts();

                UpdateProgress(100, "Instalacao concluida com sucesso!");
                Log("==============================================");
                Log("SISTEMA INSTALADO COM SUCESSO!");
                Log("Painel Web:   http://localhost:3001");
                Log("App Mobile:   http://localhost:8082");
                Log("Acesso Rede:  http://" + localIp + ":3001");
                Log("Mobile Rede:  http://" + localIp + ":8082");
                Log("==============================================");

                this.Invoke(new Action(() => {
                    btnAction.Text = "INSTALADO COM SUCESSO! ✅";
                    btnAction.BackColor = Color.FromArgb(16, 185, 129);
                    btnAction.ForeColor = Color.White;
                    btnOpenBrowser.Visible = true;
                    MessageBox.Show("SmartCybertech Gestão foi instalado e iniciado com sucesso!\n\n" +
                                    "Acesse:\n" +
                                    "• Painel Local: http://localhost:3001\n" +
                                    "• App Mobile: http://localhost:8082\n" +
                                    "• Outros PCs da Rede: http://" + localIp + ":3001",
                                    "Instalação Concluída", MessageBoxButtons.OK, MessageBoxIcon.Information);
                }));
            }
            catch (Exception ex)
            {
                UpdateProgress(0, "Erro durante a instalacao.");
                Log("ERRO: " + ex.Message);
                this.Invoke(new Action(() => {
                    btnAction.Enabled = true;
                    btnAction.Text = "TENTAR NOVAMENTE";
                    MessageBox.Show("Erro durante a instalação:\n" + ex.Message, "Falha na Instalação", MessageBoxButtons.OK, MessageBoxIcon.Error);
                }));
            }
        }

        private void RegisterHosts()
        {
            try
            {
                string hostsFile = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.System), @"drivers\etc\hosts");
                string content = File.Exists(hostsFile) ? File.ReadAllText(hostsFile) : "";
                if (!content.Contains("smartcybertech"))
                {
                    using (StreamWriter sw = File.AppendText(hostsFile))
                    {
                        sw.WriteLine();
                        sw.WriteLine("# --- SmartCybertech Host ---");
                        sw.WriteLine("127.0.0.1       smartcybertech");
                        sw.WriteLine(localIp + "       smartcybertech");
                        sw.WriteLine("# ---------------------------");
                    }
                }
            }
            catch (Exception ex)
            {
                Log("Aviso hosts: " + ex.Message);
            }
        }

        private void CreateShortcuts()
        {
            try
            {
                string desktop = Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory);
                
                // Atalho Web Painel
                string shortcutPanel = Path.Combine(desktop, "SmartCybertech Gestão.url");
                File.WriteAllText(shortcutPanel, "[InternetShortcut]\r\nURL=http://localhost:3001\r\nIconIndex=0\r\n");

                // Atalho App Mobile
                string shortcutMobile = Path.Combine(desktop, "📱 App Mobile Gerentes.url");
                File.WriteAllText(shortcutMobile, "[InternetShortcut]\r\nURL=http://localhost:8082\r\nIconIndex=0\r\n");

                // Atalho Simulador Smartphone
                string simuladorHtml = Path.Combine(targetDir, @"public\Simulador-Smartphone-Universal.html");
                if (File.Exists(simuladorHtml))
                {
                    string shortcutSim = Path.Combine(desktop, "📱 Simulador Smartphone.url");
                    File.WriteAllText(shortcutSim, "[InternetShortcut]\r\nURL=file:///" + simuladorHtml.Replace('\\', '/') + "\r\nIconIndex=0\r\n");
                }

                // 4. INSTALADOR PARA OUTRAS MÁQUINAS DA REDE (Executável Cliente)
                Assembly asm = Assembly.GetExecutingAssembly();
                using (Stream clientStream = asm.GetManifestResourceStream("ClientExe"))
                {
                    if (clientStream != null)
                    {
                        byte[] clientBytes = new byte[clientStream.Length];
                        clientStream.Read(clientBytes, 0, clientBytes.Length);

                        // Salva na Area de Trabalho do Servidor para copiar em pendrive
                        string clientDesktopExe = Path.Combine(desktop, "🔗 Conectar Outros PCs da Rede.exe");
                        File.WriteAllBytes(clientDesktopExe, clientBytes);

                        // Salva tambem na pasta public para download via navegador
                        string publicDir = Path.Combine(targetDir, "public");
                        if (!Directory.Exists(publicDir)) Directory.CreateDirectory(publicDir);
                        string publicClientExe = Path.Combine(publicDir, "Instalador_Cliente_Rede.exe");
                        File.WriteAllBytes(publicClientExe, clientBytes);

                        Log("Instalador Cliente disponibilizado na Area de Trabalho!");
                    }
                }

                Log("Atalhos criados na Area de Trabalho.");
            }
            catch (Exception ex)
            {
                Log("Aviso atalhos: " + ex.Message);
            }
        }

        private void RunCmd(string command)
        {
            try
            {
                ProcessStartInfo psi = new ProcessStartInfo("cmd.exe", "/c " + command);
                psi.CreateNoWindow = true;
                psi.UseShellExecute = false;
                Process p = Process.Start(psi);
                p.WaitForExit(10000);
            }
            catch { }
        }
    }
}
