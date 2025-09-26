# SSL 证书目录

## 概述

此目录用于存放 SSL/TLS 证书文件，用于 HTTPS 配置。

## 文件说明

- `cert.pem` - SSL 证书文件
- `key.pem` - SSL 私钥文件
- `ca-bundle.pem` - CA 证书链文件（可选）

## 证书获取方式

### 1. Let's Encrypt 免费证书

```bash
# 安装 certbot
sudo apt-get install certbot

# 获取证书
sudo certbot certonly --standalone -d your-domain.com

# 证书文件位置
# /etc/letsencrypt/live/your-domain.com/fullchain.pem -> cert.pem
# /etc/letsencrypt/live/your-domain.com/privkey.pem -> key.pem
```

### 2. 自签名证书（仅用于开发环境）

```bash
# 生成私钥
openssl genrsa -out key.pem 2048

# 生成证书签名请求
openssl req -new -key key.pem -out cert.csr

# 生成自签名证书
openssl x509 -req -days 365 -in cert.csr -signkey key.pem -out cert.pem
```

### 3. 商业证书

从证书颁发机构（如 DigiCert、GlobalSign 等）购买证书，并将证书文件放置在此目录。

## 安全注意事项

1. **权限设置**: 确保私钥文件权限为 600
   ```bash
   chmod 600 key.pem
   chmod 644 cert.pem
   ```

2. **备份**: 定期备份证书文件
3. **更新**: 及时更新即将过期的证书
4. **版本控制**: 不要将私钥文件提交到版本控制系统

## 证书更新

### Let's Encrypt 自动更新

```bash
# 添加到 crontab
0 12 * * * /usr/bin/certbot renew --quiet && docker-compose restart nginx
```

### 手动更新

1. 获取新证书
2. 替换旧证书文件
3. 重启 Nginx 容器

```bash
docker-compose restart nginx
```

## 测试证书

```bash
# 测试 SSL 配置
openssl s_client -connect your-domain.com:443 -servername your-domain.com

# 检查证书有效期
openssl x509 -in cert.pem -text -noout | grep "Not After"
```
