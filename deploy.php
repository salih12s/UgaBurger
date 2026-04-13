<?php
/**
 * MusattiBurger - Plesk Otomatik Deploy Script
 * 
 * KULLANIM:
 * 1. Tüm proje dosyalarını ZIP olarak sunucuya yükleyin
 * 2. Bu dosyayı /httpdocs/deploy.php olarak koyun
 * 3. Tarayıcıda https://domain.com/deploy.php açın
 * 4. Adımları takip edin
 * 
 * GÜVENLİK: Deploy sonrası bu dosyayı SİLİN!
 */

// ========== AYARLAR ==========
$DEPLOY_KEY     = 'ugaburger2026';   // URL'de ?key=ugaburger2026 olmalı
$PROJECT_ZIP    = 'musattiburger.zip'; // Yüklenen ZIP dosya adı
$HTTPDOCS       = __DIR__;            // /httpdocs dizini (bu dosyanın olduğu yer)
$PROJECT_ROOT   = dirname($HTTPDOCS); // /httpdocs'un bir üstü
$SERVER_DIR     = $PROJECT_ROOT . '/api'; // Node.js backend dizini
$IMAGES_DIR     = $PROJECT_ROOT . '/Images';
$ENV_FILE       = $PROJECT_ROOT . '/.env';

// ========== GÜVENLİK KONTROLÜ ==========
if (!isset($_GET['key']) || $_GET['key'] !== $DEPLOY_KEY) {
    http_response_code(403);
    die('⛔ Yetkisiz erişim. URL\'ye ?key=ugaburger2026 ekleyin.');
}

header('Content-Type: text/html; charset=utf-8');
echo '<!DOCTYPE html><html><head><meta charset="utf-8"><title>MusattiBurger Deploy</title>';
echo '<style>body{font-family:monospace;background:#1a1a2e;color:#e0e0e0;padding:20px;max-width:900px;margin:0 auto}';
echo '.ok{color:#4ade80}.err{color:#f87171}.warn{color:#fbbf24}.info{color:#60a5fa}';
echo 'h1{color:#dc2626;border-bottom:2px solid #dc2626;padding-bottom:10px}';
echo '.step{background:#16213e;padding:15px;margin:10px 0;border-radius:8px;border-left:4px solid #3b82f6}';
echo '.step.success{border-left-color:#4ade80}.step.error{border-left-color:#f87171}';
echo '</style></head><body>';
echo '<h1>🍔 MusattiBurger - Plesk Deploy</h1>';
echo '<p class="info">Deploy başlıyor... ' . date('Y-m-d H:i:s') . '</p>';
flush();

$stepNum = 0;
$errors = [];

function step($title, $callback) {
    global $stepNum, $errors;
    $stepNum++;
    echo "<div class='step'>";
    echo "<strong>Adım $stepNum:</strong> $title<br>";
    flush();
    
    try {
        $result = $callback();
        if ($result === false) {
            echo "<span class='err'>✗ BAŞARISIZ</span>";
            $errors[] = "Adım $stepNum: $title";
            echo "</div>";
            return false;
        }
        echo "<span class='ok'>✓ BAŞARILI</span>";
        echo "</div>";
        return true;
    } catch (Exception $e) {
        echo "<span class='err'>✗ HATA: " . htmlspecialchars($e->getMessage()) . "</span>";
        $errors[] = "Adım $stepNum: $title - " . $e->getMessage();
        echo "</div>";
        return false;
    }
    flush();
}

// ========== ADIM 0: ESKİ DJANGO/PYTHON UYGULAMASINI TEMİZLE ==========
step('Eski uygulama dosyaları temizleniyor', function() use ($PROJECT_ROOT, $HTTPDOCS) {
    $djangoFiles = [
        'passenger_wsgi.py', 'app.py', 'manage.py', 'requirements.txt',
        'db.sqlite3', 'Pipfile', 'Pipfile.lock', 'runtime.txt',
    ];
    $djangoDirs = [
        'core', 'venv', 'env', '.venv', 'staticfiles', 'media',
        'templates', 'static', '__pycache__',
    ];
    
    $cleaned = 0;
    
    // Ana dizindeki Django dosyalarını sil
    foreach ($djangoFiles as $f) {
        $path = $PROJECT_ROOT . '/' . $f;
        if (file_exists($path)) {
            unlink($path);
            echo "<br><span class='warn'>  Silindi: $f</span>";
            $cleaned++;
        }
    }
    foreach ($djangoDirs as $d) {
        $path = $PROJECT_ROOT . '/' . $d;
        if (is_dir($path)) {
            shell_exec("rm -rf " . escapeshellarg($path));
            echo "<br><span class='warn'>  Silindi: $d/</span>";
            $cleaned++;
        }
    }
    
    // httpdocs'taki eski/hatalı dosyaları temizle (deploy.php ve zip hariç)
    $keepFiles = ['deploy.php', 'musattiburger.zip', '.htaccess', '.node-version'];
    $httpdocsItems = scandir($HTTPDOCS);
    foreach ($httpdocsItems as $item) {
        if ($item === '.' || $item === '..') continue;
        if (in_array($item, $keepFiles)) continue;
        $fullPath = $HTTPDOCS . '/' . $item;
        if (is_dir($fullPath)) {
            shell_exec("rm -rf " . escapeshellarg($fullPath));
            echo "<br><span class='warn'>  httpdocs/ temizlendi: $item/</span>";
            $cleaned++;
        } elseif (is_file($fullPath)) {
            unlink($fullPath);
            echo "<br><span class='warn'>  httpdocs/ temizlendi: $item</span>";
            $cleaned++;
        }
    }
    
    if ($cleaned === 0) {
        echo "<br><span class='info'>  Temizlenecek eski dosya bulunamadı</span>";
    } else {
        echo "<br><span class='ok'>  $cleaned öğe temizlendi</span>";
    }
    
    return true;
});

// ========== ADIM 1: NODE.JS KONTROL ==========
step('Node.js kurulumu kontrol ediliyor', function() {
    // Plesk nodenv yolunu PATH'e ekle
    $nodenvDir = getenv('HOME') . '/.nodenv';
    if (is_dir($nodenvDir . '/shims')) {
        putenv("PATH=" . $nodenvDir . "/shims:" . $nodenvDir . "/bin:" . getenv('PATH'));
    }
    
    // Ayrıca /opt/plesk/node yollarını da dene
    $pleskNodePaths = glob('/opt/plesk/node/*/bin');
    if ($pleskNodePaths) {
        $latestPath = end($pleskNodePaths);
        putenv("PATH=" . $latestPath . ":" . getenv('PATH'));
    }
    
    $nodeVersion = trim(shell_exec('node --version 2>&1'));
    $npmVersion = trim(shell_exec('npm --version 2>&1'));
    
    if (stripos($nodeVersion, 'v') === 0) {
        echo "<br><span class='info'>  Node.js: $nodeVersion</span>";
        echo "<br><span class='info'>  npm: $npmVersion</span>";
        return true;
    }
    
    // Manuel yol araması
    $paths = [
        '/opt/plesk/node/25/bin',
        '/opt/plesk/node/20/bin',
        '/opt/plesk/node/18/bin',
    ];
    
    foreach ($paths as $p) {
        if (file_exists($p . '/node')) {
            putenv("PATH=$p:" . getenv('PATH'));
            $v = trim(shell_exec("$p/node --version 2>&1"));
            echo "<br><span class='info'>  Node.js bulundu: $p ($v)</span>";
            return true;
        }
    }
    
    echo "<br><span class='err'>  Node.js bulunamadı! Plesk > Extensions > Node.js yükleyin.</span>";
    return false;
});

// ========== ADIM 2: ZIP DOSYASINI BUL VE AÇ ==========
step('Proje dosyaları hazırlanıyor', function() use ($HTTPDOCS, $PROJECT_ROOT, $PROJECT_ZIP) {
    // ZIP dosyasını bul
    $zipPath = null;
    $searchPaths = [
        $HTTPDOCS . '/' . $PROJECT_ZIP,
        $PROJECT_ROOT . '/' . $PROJECT_ZIP,
        $HTTPDOCS . '/musattiburger.zip',
        $PROJECT_ROOT . '/musattiburger.zip',
    ];
    
    foreach ($searchPaths as $sp) {
        if (file_exists($sp)) {
            $zipPath = $sp;
            break;
        }
    }
    
    if ($zipPath) {
        echo "<br><span class='info'>  ZIP bulundu: $zipPath</span>";
        
        $zip = new ZipArchive();
        if ($zip->open($zipPath) === true) {
            $zip->extractTo($PROJECT_ROOT . '/temp_extract');
            $zip->close();
            echo "<br><span class='info'>  ZIP açıldı</span>";
            
            // İçerideki klasör yapısını tespit et
            $extractDir = $PROJECT_ROOT . '/temp_extract';
            $items = scandir($extractDir);
            $innerDir = null;
            
            foreach ($items as $item) {
                if ($item !== '.' && $item !== '..' && is_dir($extractDir . '/' . $item)) {
                    if (file_exists($extractDir . '/' . $item . '/server') || 
                        file_exists($extractDir . '/' . $item . '/client') ||
                        file_exists($extractDir . '/' . $item . '/package.json')) {
                        $innerDir = $extractDir . '/' . $item;
                        break;
                    }
                }
            }
            
            $source = $innerDir ?: $extractDir;
            echo "<br><span class='info'>  Kaynak: $source</span>";
            
            // server/ → /api olarak kopyala
            if (is_dir($source . '/server')) {
                shell_exec("cp -rf " . escapeshellarg($source . '/server') . " " . escapeshellarg($PROJECT_ROOT . '/api'));
                echo "<br><span class='info'>  server/ → /api kopyalandı</span>";
            }
            
            // client/ kopyala (build almak için)
            if (is_dir($source . '/client')) {
                shell_exec("cp -rf " . escapeshellarg($source . '/client') . " " . escapeshellarg($PROJECT_ROOT . '/client'));
                echo "<br><span class='info'>  client/ kopyalandı</span>";
            }
            
            // Images/ kopyala
            if (is_dir($source . '/Images')) {
                shell_exec("cp -rf " . escapeshellarg($source . '/Images') . " " . escapeshellarg($PROJECT_ROOT . '/Images'));
                echo "<br><span class='info'>  Images/ kopyalandı</span>";
            }
            
            // .env.example kopyala
            if (file_exists($source . '/.env.example') && !file_exists($PROJECT_ROOT . '/.env')) {
                copy($source . '/.env.example', $PROJECT_ROOT . '/.env');
                echo "<br><span class='info'>  .env.example → .env kopyalandı</span>";
            }
            
            // .htaccess kopyala
            if (file_exists($source . '/.htaccess')) {
                copy($source . '/.htaccess', $HTTPDOCS . '/.htaccess');
                echo "<br><span class='info'>  .htaccess kopyalandı</span>";
            }
            
            // Temizle
            shell_exec("rm -rf " . escapeshellarg($extractDir));
            echo "<br><span class='info'>  Geçici dosyalar temizlendi</span>";
        } else {
            echo "<br><span class='err'>  ZIP açılamadı!</span>";
            return false;
        }
    } else {
        // ZIP yok, dosyalar zaten yerinde mi kontrol et
        $serverExists = is_dir($PROJECT_ROOT . '/api') || is_dir($PROJECT_ROOT . '/server');
        $clientExists = is_dir($PROJECT_ROOT . '/client');
        
        if (!$serverExists || !$clientExists) {
            echo "<br><span class='err'>  Ne ZIP dosyası ne de proje dosyaları bulunamadı!</span>";
            echo "<br><span class='warn'>  '$PROJECT_ZIP' dosyasını httpdocs'a yükleyin veya dosyaları manuel kopyalayın.</span>";
            return false;
        }
        
        // server/ → /api olarak taşı (eğer /api yoksa)
        if (!is_dir($PROJECT_ROOT . '/api') && is_dir($PROJECT_ROOT . '/server')) {
            shell_exec("cp -rf " . escapeshellarg($PROJECT_ROOT . '/server') . " " . escapeshellarg($PROJECT_ROOT . '/api'));
            echo "<br><span class='info'>  server/ → /api kopyalandı</span>";
        }
        
        echo "<br><span class='info'>  Mevcut dosyalar kullanılıyor</span>";
    }
    
    return true;
});

// ========== ADIM 3: .ENV OLUŞTUR ==========
step('.env dosyası yapılandırılıyor', function() use ($ENV_FILE) {
    if (file_exists($ENV_FILE)) {
        echo "<br><span class='info'>  .env zaten mevcut, atlanıyor</span>";
        return true;
    }
    
    $envContent = "# MusattiBurger Ortam Değişkenleri
# Bu dosya deploy.php tarafından oluşturuldu: " . date('Y-m-d H:i:s') . "

# VERITABANI (MariaDB)
DB_NAME=UgaBurger
DB_USER=ugaburger
DB_PASSWORD=ugaburger33
DB_HOST=localhost
DB_PORT=3306

# SUNUCU
PORT=3000

# JWT (GÜVENLİ BİR ANAHTAR GİRİN!)
JWT_SECRET=" . bin2hex(random_bytes(32)) . "

# CLIENT URL
CLIENT_URL=https://ugaburger.com
";
    
    file_put_contents($ENV_FILE, $envContent);
    chmod($ENV_FILE, 0600); // Sadece owner okuyabilsin
    echo "<br><span class='ok'>  .env oluşturuldu (izinler: 600)</span>";
    return true;
});

// ========== ADIM 4: BACKEND NPM INSTALL ==========
step('Backend bağımlılıkları yükleniyor (npm install)', function() use ($SERVER_DIR) {
    if (!is_dir($SERVER_DIR)) {
        echo "<br><span class='err'>  /api dizini bulunamadı!</span>";
        return false;
    }
    
    // uploads klasörü oluştur
    if (!is_dir($SERVER_DIR . '/uploads')) {
        mkdir($SERVER_DIR . '/uploads', 0755, true);
        echo "<br><span class='info'>  uploads/ klasörü oluşturuldu</span>";
    }
    
    $envPath = "PATH=" . getenv('PATH');
    $output = shell_exec("cd " . escapeshellarg($SERVER_DIR) . " && $envPath npm install --production 2>&1");
    echo "<br><pre style='font-size:11px;max-height:200px;overflow-y:auto;color:#888'>" . htmlspecialchars(substr($output, -1000)) . "</pre>";
    
    // node_modules kontrolü
    if (is_dir($SERVER_DIR . '/node_modules')) {
        $count = count(scandir($SERVER_DIR . '/node_modules')) - 2;
        echo "<span class='info'>  $count paket yüklendi</span>";
        return true;
    }
    
    echo "<br><span class='err'>  npm install başarısız olmuş olabilir</span>";
    return false;
});

// ========== ADIM 5: CLIENT BUILD ==========
step('Frontend build alınıyor (React)', function() use ($PROJECT_ROOT, $HTTPDOCS) {
    $clientDir = $PROJECT_ROOT . '/client';
    
    if (!is_dir($clientDir)) {
        echo "<br><span class='err'>  /client dizini bulunamadı!</span>";
        return false;
    }
    
    // npm install
    echo "<br><span class='info'>  Client npm install başlıyor...</span>";
    flush();
    $envPath = "PATH=" . getenv('PATH');
    $output = shell_exec("cd " . escapeshellarg($clientDir) . " && $envPath npm install 2>&1");
    echo "<br><pre style='font-size:11px;max-height:150px;overflow-y:auto;color:#888'>" . htmlspecialchars(substr($output, -500)) . "</pre>";
    
    // Build
    echo "<span class='info'>  npm run build başlıyor...</span>";
    flush();
    $buildOutput = shell_exec("cd " . escapeshellarg($clientDir) . " && $envPath npm run build 2>&1");
    echo "<br><pre style='font-size:11px;max-height:150px;overflow-y:auto;color:#888'>" . htmlspecialchars(substr($buildOutput, -500)) . "</pre>";
    
    // Build çıktısını bul
    $distDir = $clientDir . '/dist';
    if (!is_dir($distDir)) {
        echo "<br><span class='err'>  dist/ klasörü oluşmadı. Build hatası olabilir.</span>";
        return false;
    }
    
    // dist/ içindeki dosyaları httpdocs'a kopyala
    // Önce mevcut deploy.php ve .htaccess'i koru
    $preserveFiles = ['deploy.php', '.htaccess'];
    $preserved = [];
    foreach ($preserveFiles as $pf) {
        $pfPath = $HTTPDOCS . '/' . $pf;
        if (file_exists($pfPath)) {
            $preserved[$pf] = file_get_contents($pfPath);
        }
    }
    
    // dist içeriğini httpdocs'a kopyala
    shell_exec("cp -rf " . escapeshellarg($distDir) . "/* " . escapeshellarg($HTTPDOCS) . "/");
    shell_exec("cp -rf " . escapeshellarg($distDir) . "/.* " . escapeshellarg($HTTPDOCS) . "/ 2>/dev/null");
    
    // Korunan dosyaları geri yaz
    foreach ($preserved as $pf => $content) {
        file_put_contents($HTTPDOCS . '/' . $pf, $content);
    }
    
    // .htaccess'in yerinde olduğundan emin ol
    if (!file_exists($HTTPDOCS . '/.htaccess')) {
        $htaccess = 'RewriteEngine On

# API isteklerini Node.js backend\'e yönlendir
RewriteCond %{REQUEST_URI} ^/api [NC]
RewriteRule ^api/(.*)$ http://localhost:3000/api/$1 [P,L]

# Upload dosyalarını backend\'e yönlendir
RewriteCond %{REQUEST_URI} ^/uploads [NC]
RewriteRule ^uploads/(.*)$ http://localhost:3000/uploads/$1 [P,L]

# Images dosyalarını backend\'e yönlendir
RewriteCond %{REQUEST_URI} ^/images [NC]
RewriteRule ^images/(.*)$ http://localhost:3000/images/$1 [P,L]

# React SPA
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]
';
        file_put_contents($HTTPDOCS . '/.htaccess', $htaccess);
    }
    
    $fileCount = count(glob($HTTPDOCS . '/*'));
    echo "<span class='ok'>  Build dosyaları httpdocs'a kopyalandı ($fileCount dosya)</span>";
    return true;
});

// ========== ADIM 6: DATABASE SEED ==========
step('Veritabanı seed ediliyor', function() use ($SERVER_DIR, $PROJECT_ROOT) {
    if (!file_exists($SERVER_DIR . '/seeds/seed.js')) {
        echo "<br><span class='warn'>  seed.js bulunamadı, atlanıyor</span>";
        return true; // Opsiyonel
    }
    
    // .env'nin erişilebilir olduğundan emin ol
    $envPath = "PATH=" . getenv('PATH');
    $seedCmd = "cd " . escapeshellarg($SERVER_DIR) . " && $envPath node seeds/seed.js 2>&1";
    $output = shell_exec($seedCmd);
    echo "<br><pre style='font-size:11px;max-height:200px;overflow-y:auto;color:#888'>" . htmlspecialchars($output) . "</pre>";
    
    if (stripos($output, 'hata') !== false || stripos($output, 'error') !== false) {
        echo "<span class='warn'>  Seed'de uyarılar olabilir (tablolar zaten varsa normal)</span>";
    }
    
    if (stripos($output, 'tamamlandı') !== false || stripos($output, 'oluşturuldu') !== false) {
        echo "<span class='ok'>  Seed başarılı!</span>";
    }
    
    return true;
});

// ========== ADIM 7: NODE SUNUCUYU BAŞLAT ==========
step('Node.js sunucu başlatılıyor', function() use ($SERVER_DIR) {
    // Önce çalışan bir process varsa durdur
    shell_exec("pkill -f 'node.*server.js' 2>/dev/null");
    sleep(1);
    
    // nohup ile arka planda başlat
    $logFile = $SERVER_DIR . '/server.log';
    $envPath = "PATH=" . getenv('PATH');
    $cmd = "cd " . escapeshellarg($SERVER_DIR) . " && $envPath nohup node server.js > " . escapeshellarg($logFile) . " 2>&1 &";
    shell_exec($cmd);
    sleep(2);
    
    // Process çalışıyor mu kontrol et
    $check = shell_exec("pgrep -f 'node.*server.js' 2>/dev/null");
    
    if (trim($check)) {
        $pid = trim($check);
        echo "<br><span class='ok'>  Node.js sunucu çalışıyor (PID: $pid)</span>";
        echo "<br><span class='info'>  Log: $logFile</span>";
        
        // Sağlık kontrolü
        sleep(2);
        $health = @file_get_contents('http://localhost:3000/api/health');
        if ($health) {
            $data = json_decode($health, true);
            if (isset($data['status']) && $data['status'] === 'ok') {
                echo "<br><span class='ok'>  Health check: OK ✓</span>";
            }
        } else {
            echo "<br><span class='warn'>  Health check henüz yanıt vermedi (birkaç saniye bekleyin)</span>";
        }
        
        return true;
    }
    
    echo "<br><span class='err'>  Node.js başlatılamadı!</span>";
    if (file_exists($logFile)) {
        $log = file_get_contents($logFile);
        echo "<br><pre style='font-size:11px;color:#f87171'>" . htmlspecialchars(substr($log, -500)) . "</pre>";
    }
    echo "<br><span class='warn'>  Plesk > Node.js bölümünden manuel başlatmayı deneyin.</span>";
    return false;
});

// ========== ADIM 8: DOĞRULAMA ==========
step('Kurulum doğrulanıyor', function() use ($HTTPDOCS, $SERVER_DIR, $PROJECT_ROOT) {
    $checks = [
        'index.html (React)' => file_exists($HTTPDOCS . '/index.html'),
        '.htaccess' => file_exists($HTTPDOCS . '/.htaccess'),
        'server.js' => file_exists($SERVER_DIR . '/server.js'),
        'node_modules' => is_dir($SERVER_DIR . '/node_modules'),
        '.env' => file_exists($PROJECT_ROOT . '/.env'),
        'uploads/' => is_dir($SERVER_DIR . '/uploads'),
    ];
    
    $allOk = true;
    foreach ($checks as $name => $ok) {
        $icon = $ok ? "<span class='ok'>✓</span>" : "<span class='err'>✗</span>";
        echo "<br>  $icon $name";
        if (!$ok) $allOk = false;
    }
    
    return $allOk;
});

// ========== SONUÇ ==========
echo '<div style="margin-top:30px;padding:20px;border-radius:12px;';
if (empty($errors)) {
    echo 'background:#064e3b;border:2px solid #4ade80">';
    echo '<h2 style="color:#4ade80;margin-top:0">🎉 Deploy Tamamlandı!</h2>';
    echo '<p>MusattiBurger başarıyla kuruldu.</p>';
    echo '<ul>';
    echo '<li>🌐 Site: <a href="/" style="color:#60a5fa">Ana Sayfa</a></li>';
    echo '<li>📡 API: <a href="/api/health" style="color:#60a5fa">/api/health</a></li>';
    echo '<li>🔧 Admin: <a href="/admin" style="color:#60a5fa">/admin</a></li>';
    echo '</ul>';
    echo '<p class="warn">⚠️ GÜVENLİK: Bu deploy.php dosyasını şimdi SİLİN!</p>';
    echo '<pre style="color:#fbbf24">rm ' . htmlspecialchars($HTTPDOCS) . '/deploy.php</pre>';
} else {
    echo 'background:#7f1d1d;border:2px solid #f87171">';
    echo '<h2 style="color:#f87171;margin-top:0">⚠️ Deploy Kısmen Tamamlandı</h2>';
    echo '<p>Aşağıdaki adımlarda sorun oluştu:</p>';
    echo '<ul>';
    foreach ($errors as $err) {
        echo "<li class='err'>$err</li>";
    }
    echo '</ul>';
    echo '<p>Manuel müdahale gerekebilir. Plesk panelinden kontrol edin.</p>';
}
echo '</div>';

// PM2 / Supervisor bilgisi
echo '<div class="step" style="margin-top:20px">';
echo '<strong>💡 ÖNERİ: Node.js Kalıcı Çalışma</strong><br>';
echo '<p>Node.js sunucunun crash sonrası otomatik yeniden başlaması için:</p>';
echo '<pre style="color:#60a5fa">';
echo "# PM2 ile (önerilen):\n";
echo "npm install -g pm2\n";
echo "cd /api && pm2 start server.js --name ugaburger\n";
echo "pm2 save && pm2 startup\n\n";
echo "# Veya Plesk > Node.js bölümünden yapılandırın";
echo '</pre>';
echo '</div>';

echo '<p style="color:#666;margin-top:30px;font-size:12px">Deploy script v1.0 | ' . date('Y-m-d H:i:s') . '</p>';
echo '</body></html>';
?>
