using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Net;
using System.Security.Principal;
using System.Threading;
using System.Windows.Forms;

namespace SmartCybertechClientInstaller
{
    static class Program
    {
        [STAThread]
        static void Main(string[] args)
        {
            if (!IsAdministrator())
            {
                try
                {
                    ProcessStartInfo psi = new ProcessStartInfo();
                    psi.FileName = Application.ExecutablePath;
                    if (args != null && args.Length > 0)
                    {
                        psi.Arguments = string.Join(" ", args);
                    }
                    psi.UseShellExecute = true;
                    psi.Verb = "runas";
                    Process.Start(psi);
                }
                catch { }
                return;
            }

            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            
            string defaultServerIp = "192.168.90.160";
            if (args != null && args.Length > 0 && !string.IsNullOrEmpty(args[0]))
            {
                defaultServerIp = args[0].Trim();
            }

            Application.Run(new ClientForm(defaultServerIp));
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

    public class ClientForm : Form
    {
        private Label lblTitle;
        private Label lblSubtitle;
        private Label lblIp;
        private TextBox txtServerIp;
        private Button btnConnect;
        private Button btnOpenBrowser;
        private Label lblStatus;
        private RichTextBox txtLog;

        public ClientForm(string initialIp)
        {
            InitializeComponent(initialIp);
        }

        private void InitializeComponent(string initialIp)
        {
            this.Text = "SmartCybertech — Conectar Este Computador ao Servidor";
            this.Size = new Size(540, 440);
            this.FormBorderStyle = FormBorderStyle.FixedDialog;
            this.MaximizeBox = false;
            this.StartPosition = FormStartPosition.CenterScreen;
            this.BackColor = Color.FromArgb(10, 15, 29);
            this.ForeColor = Color.FromArgb(226, 232, 240);

            lblTitle = new Label();
            lblTitle.Text = "CONECTAR À REDE SMARTCYBERTECH";
            lblTitle.Font = new Font("Segoe UI", 14, FontStyle.Bold);
            lblTitle.ForeColor = Color.FromArgb(34, 211, 238);
            lblTitle.Location = new Point(24, 20);
            lblTitle.AutoSize = true;

            lblSubtitle = new Label();
            lblSubtitle.Text = "Configure este computador para acessar o servidor da loja com 1 clique.";
            lblSubtitle.Font = new Font("Segoe UI", 9.5f, FontStyle.Regular);
            lblSubtitle.ForeColor = Color.FromArgb(148, 163, 184);
            lblSubtitle.Location = new Point(26, 50);
            lblSubtitle.AutoSize = true;

            lblIp = new Label();
            lblIp.Text = "Endereço IP do Servidor na Rede:";
            lblIp.Font = new Font("Segoe UI", 9.5f, FontStyle.Bold);
            lblIp.ForeColor = Color.FromArgb(203, 213, 225);
            lblIp.Location = new Point(26, 90);
            lblIp.AutoSize = true;

            txtServerIp = new TextBox();
            txtServerIp.Text = initialIp;
            txtServerIp.Font = new Font("Segoe UI", 12, FontStyle.Bold);
            txtServerIp.BackColor = Color.FromArgb(15, 23, 42);
            txtServerIp.ForeColor = Color.FromArgb(34, 211, 238);
            txtServerIp.BorderStyle = BorderStyle.FixedSingle;
            txtServerIp.Location = new Point(28, 115);
            txtServerIp.Size = new Size(468, 30);

            btnConnect = new Button();
            btnConnect.Text = "⚡ CONECTAR ESTE COMPUTADOR AGORA";
            btnConnect.Font = new Font("Segoe UI", 10.5f, FontStyle.Bold);
            btnConnect.ForeColor = Color.Black;
            btnConnect.BackColor = Color.FromArgb(6, 182, 212);
            btnConnect.FlatStyle = FlatStyle.Flat;
            btnConnect.FlatAppearance.BorderSize = 0;
            btnConnect.Location = new Point(28, 160);
            btnConnect.Size = new Size(468, 44);
            btnConnect.Cursor = Cursors.Hand;
            btnConnect.Click += BtnConnect_Click;

            lblStatus = new Label();
            lblStatus.Text = "Clique no botão acima para conectar.";
            lblStatus.Font = new Font("Segoe UI", 9, FontStyle.Bold);
            lblStatus.ForeColor = Color.FromArgb(148, 163, 184);
            lblStatus.Location = new Point(28, 215);
            lblStatus.Size = new Size(468, 20);

            txtLog = new RichTextBox();
            txtLog.Location = new Point(28, 240);
            txtLog.Size = new Size(468, 100);
            txtLog.BackColor = Color.FromArgb(15, 23, 42);
            txtLog.ForeColor = Color.FromArgb(148, 163, 184);
            txtLog.Font = new Font("Consolas", 8.5f, FontStyle.Regular);
            txtLog.BorderStyle = BorderStyle.None;
            txtLog.ReadOnly = true;

            btnOpenBrowser = new Button();
            btnOpenBrowser.Text = "Abrir Sistema Agora ➔";
            btnOpenBrowser.Font = new Font("Segoe UI", 10, FontStyle.Bold);
            btnOpenBrowser.ForeColor = Color.White;
            btnOpenBrowser.BackColor = Color.FromArgb(16, 185, 129);
            btnOpenBrowser.FlatStyle = FlatStyle.Flat;
            btnOpenBrowser.FlatAppearance.BorderSize = 0;
            btnOpenBrowser.Location = new Point(28, 350);
            btnOpenBrowser.Size = new Size(468, 38);
            btnOpenBrowser.Cursor = Cursors.Hand;
            btnOpenBrowser.Visible = false;
            btnOpenBrowser.Click += (s, e) => {
                string ip = txtServerIp.Text.Trim();
                Process.Start("http://" + ip + ":3001");
            };

            this.Controls.Add(lblTitle);
            this.Controls.Add(lblSubtitle);
            this.Controls.Add(lblIp);
            this.Controls.Add(txtServerIp);
            this.Controls.Add(btnConnect);
            this.Controls.Add(lblStatus);
            this.Controls.Add(txtLog);
            this.Controls.Add(btnOpenBrowser);

            Log("Pronto para configurar o acesso à rede.");
            Log("Servidor pré-configurado: " + initialIp);
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

        private void BtnConnect_Click(object sender, EventArgs e)
        {
            string ip = txtServerIp.Text.Trim();
            if (string.IsNullOrEmpty(ip))
            {
                MessageBox.Show("Por favor, digite o IP do servidor.", "Aviso", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                return;
            }

            btnConnect.Enabled = false;
            lblStatus.Text = "Conectando ao servidor...";
            lblStatus.ForeColor = Color.FromArgb(34, 211, 238);

            Thread t = new Thread(() => ConfigureClient(ip));
            t.IsBackground = true;
            t.Start();
        }

        private void ConfigureClient(string serverIp)
        {
            try
            {
                Log("Testando conexao com o servidor (" + serverIp + ":3001)...");
                bool online = false;
                try
                {
                    HttpWebRequest req = (HttpWebRequest)WebRequest.Create("http://" + serverIp + ":3001");
                    req.Timeout = 4000;
                    using (HttpWebResponse res = (HttpWebResponse)req.GetResponse())
                    {
                        online = true;
                    }
                }
                catch (WebException wex)
                {
                    // Se deu resposta HTTP mesmo com erro (ex: 404, 500, etc), o servidor esta ONLINE
                    if (wex.Response != null) online = true;
                }
                catch { }

                if (online)
                {
                    Log("[OK] Servidor respondeu com sucesso!");
                }
                else
                {
                    Log("[AVISO] Servidor nao respondeu no teste rapido. Continuando a configuracao...");
                }

                Log("Registrando 'smartcybertech' no arquivo hosts deste computador...");
                string hostsFile = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.System), @"drivers\etc\hosts");
                try
                {
                    string content = File.Exists(hostsFile) ? File.ReadAllText(hostsFile) : "";
                    string[] lines = content.Split(new[] { "\r\n", "\r", "\n" }, StringSplitOptions.None);
                    System.Collections.Generic.List<string> filtered = new System.Collections.Generic.List<string>();
                    foreach (string l in lines)
                    {
                        if (!l.Contains("smartcybertech"))
                        {
                            filtered.Add(l);
                        }
                    }
                    filtered.Add("");
                    filtered.Add("# --- SmartCybertech Servidor de Rede ---");
                    filtered.Add(serverIp + "       smartcybertech");
                    filtered.Add("# ---------------------------------------");

                    File.WriteAllLines(hostsFile, filtered.ToArray());
                    Log("[OK] Nome 'smartcybertech' registrado no Hosts!");
                }
                catch (Exception hex)
                {
                    Log("[AVISO] Nao foi possivel editar hosts: " + hex.Message);
                }

                Log("Criando atalhos na Area de Trabalho deste computador...");
                string desktop = Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory);

                // Atalho 1: Painel pelo IP
                File.WriteAllText(Path.Combine(desktop, "SmartCybertech Gestão.url"),
                    "[InternetShortcut]\r\nURL=http://" + serverIp + ":3001\r\nIconIndex=0\r\n");

                // Atalho 2: Mobile pelo IP
                File.WriteAllText(Path.Combine(desktop, "📱 App Mobile Gerentes.url"),
                    "[InternetShortcut]\r\nURL=http://" + serverIp + ":8082\r\nIconIndex=0\r\n");

                Log("[OK] Atalhos criados com sucesso na Area de Trabalho!");

                this.Invoke(new Action(() => {
                    lblStatus.Text = "Computador conectado com sucesso!";
                    lblStatus.ForeColor = Color.FromArgb(16, 185, 129);
                    btnConnect.Text = "CONECTADO COM SUCESSO! ✅";
                    btnConnect.BackColor = Color.FromArgb(16, 185, 129);
                    btnConnect.ForeColor = Color.White;
                    btnOpenBrowser.Visible = true;

                    MessageBox.Show(
                        "Este computador foi conectado ao servidor com sucesso!\n\n" +
                        "Os atalhos foram criados na sua Área de Trabalho:\n" +
                        "• SmartCybertech Gestão\n" +
                        "• App Mobile Gerentes\n\n" +
                        "Servidor: http://" + serverIp + ":3001",
                        "Conexão Concluída", MessageBoxButtons.OK, MessageBoxIcon.Information);
                }));
            }
            catch (Exception ex)
            {
                Log("ERRO: " + ex.Message);
                this.Invoke(new Action(() => {
                    lblStatus.Text = "Falha ao configurar conexão.";
                    lblStatus.ForeColor = Color.FromArgb(244, 63, 94);
                    btnConnect.Enabled = true;
                    MessageBox.Show("Erro: " + ex.Message, "Erro", MessageBoxButtons.OK, MessageBoxIcon.Error);
                }));
            }
        }
    }
}
