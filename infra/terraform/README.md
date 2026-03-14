# Terraform: DigitalOcean VPS

This Terraform config provisions the minimum-cost production infrastructure for Cofr:

- one DigitalOcean project
- one VPC
- one Ubuntu Droplet
- one firewall that only exposes SSH inbound
- cloud-init bootstrap for Docker, Compose, cron, UFW, fail2ban, unattended upgrades, and the `/opt/cofr` layout

This is intentionally the split between infrastructure-as-code and secret/application operations:

- Terraform owns host lifecycle and base security posture.
- GitHub Actions owns image build and deploy orchestration.
- The VPS owns runtime secrets in local files.

## Files

- `versions.tf`: Terraform and provider requirements
- `variables.tf`: configurable inputs
- `main.tf`: project, VPC, droplet, and firewall
- `cloud-init.yaml.tftpl`: first-boot VPS bootstrap
- `outputs.tf`: droplet ID and public IP
- `terraform.tfvars.example`: example inputs

## Usage

### Option A: GitHub Actions

Store these in GitHub before running the `Infrastructure` workflow:

- secret: `TF_DO_TOKEN`
- variables:
  - `TF_BOOTSTRAP_SSH_PUBLIC_KEY`
  - `TF_ADMIN_SSH_PUBLIC_KEYS`
  - `TF_ADMIN_CIDRS`

Optional overrides can also be stored as GitHub variables:

- `TF_PROJECT_NAME`
- `TF_PROJECT_DESCRIPTION`
- `TF_ENVIRONMENT`
- `TF_REGION`
- `TF_VPC_NAME`
- `TF_DROPLET_SIZE`
- `TF_IMAGE`
- `TF_DROPLET_NAME`
- `TF_ADMIN_USER`
- `TF_BOOTSTRAP_SSH_PUBLIC_KEY`
- `TF_SSH_KEY_FINGERPRINTS`

The recommended path is `TF_BOOTSTRAP_SSH_PUBLIC_KEY` plus `TF_ADMIN_SSH_PUBLIC_KEYS`, both using the same keypair. `TF_SSH_KEY_FINGERPRINTS` is only needed if you already manage SSH keys separately in DigitalOcean. The list variables must be JSON array strings. `TF_BOOTSTRAP_SSH_PUBLIC_KEY` is a plain string.

Run the workflow manually:

- `apply=false` for plan only
- `apply=true` to apply changes

### Option B: Local Terraform

```bash
cd infra/terraform
cp terraform.tfvars.example terraform.tfvars
terraform init
terraform plan
terraform apply
```

After `apply`:

1. SSH to the droplet using the configured admin user.
2. Copy `infra/` and `scripts/` into `/opt/cofr/`.
3. Create the runtime secret files under `/opt/cofr/`.
4. Add the Cloudflare tunnel token to `/opt/cofr/infra/.prod.env`.
5. Configure GitHub repository secrets.
6. Run the deploy workflow or `./scripts/setup_prod.sh` on the host.

## Inputs You Still Need To Provide

- DigitalOcean API token
- one bootstrap public SSH key Terraform can register for you
- SSH public key for the deploy user
- preferred SSH CIDR allowlist

## Security Posture

The Terraform path now assumes:

- SSH key auth only
- root SSH disabled
- password auth disabled
- UFW enabled
- fail2ban enabled
- unattended security upgrades enabled
- Docker daemon log rotation enabled
