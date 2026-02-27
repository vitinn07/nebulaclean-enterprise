# NebulaClean Enterprise

Sistema de limpeza corporativa para Windows: limpeza local, memória RAM, execução remota em rede, multiusuário (admin/usuário), logs e agendamento semanal.

## Requisitos

- **Node.js**
- **Windows** (PowerShell para scripts de limpeza)
- Para **agendamento**: executar como administrador
- Para **limpeza em rede**: PowerShell Remoting habilitado nas máquinas de destino

## Como rodar

```bash
# Instalar dependências (uma vez)
npm install

# Iniciar o servidor
npm start
```

Acesse no navegador a URL exibida no terminal (ex.: http://localhost:3000).

**Login padrão (criado na primeira execução):**
- Usuário: `admin`
- Senha: `ChangeMe!123`

Configure no `.env` (opcional): `PORT`, `HOST`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `JWT_SECRET`.

## Estrutura principal

- `server/` – Backend Node.js (Express, JWT, rotas, serviços, scripts PowerShell)
- `client/` – Interface web (login, dashboard, limpeza, logs, agendamento, admin)
- `logs/` – Logs de execução (formato por máquina)
- `config/` – Configurações (legado/engine antigo)

## Licença

MIT
