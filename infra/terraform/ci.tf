# ── GitHub Actions Terraform roles (OIDC, replaces the felix-admin access key) ──
#
# plan:  PRs and pushes to main. Read-only, and can't read the data bucket (database backups).
# apply: only jobs running in the `production` environment.

data "aws_iam_policy_document" "terraform_plan_assume" {
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]

    principals {
      type        = "Federated"
      identifiers = [local.github_oidc_provider_arn]
    }

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:sub"
      values = [
        "repo:${var.github_repository}:pull_request",
        "repo:${var.github_repository}:ref:refs/heads/main",
      ]
    }
  }
}

resource "aws_iam_role" "terraform_plan" {
  name               = "cofr-terraform-plan"
  assume_role_policy = data.aws_iam_policy_document.terraform_plan_assume.json
}

resource "aws_iam_role_policy_attachment" "terraform_plan_read_only" {
  role       = aws_iam_role.terraform_plan.name
  policy_arn = "arn:aws:iam::aws:policy/ReadOnlyAccess"
}

data "aws_iam_policy_document" "terraform_plan_deny_data" {
  statement {
    sid       = "DenyDataBucketObjects"
    effect    = "Deny"
    actions   = ["s3:GetObject", "s3:GetObjectVersion"]
    resources = ["arn:aws:s3:::cofr-data/*"]
  }
}

resource "aws_iam_role_policy" "terraform_plan_deny_data" {
  name   = "deny-data-bucket"
  role   = aws_iam_role.terraform_plan.id
  policy = data.aws_iam_policy_document.terraform_plan_deny_data.json
}

data "aws_iam_policy_document" "terraform_apply_assume" {
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]

    principals {
      type        = "Federated"
      identifiers = [local.github_oidc_provider_arn]
    }

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:sub"
      values   = ["repo:${var.github_repository}:environment:production"]
    }
  }
}

resource "aws_iam_role" "terraform_apply" {
  name               = "cofr-terraform-apply"
  assume_role_policy = data.aws_iam_policy_document.terraform_apply_assume.json
}

# Terraform here manages IAM, CloudFront, ACM and S3, so apply needs full admin.
resource "aws_iam_role_policy_attachment" "terraform_apply_admin" {
  role       = aws_iam_role.terraform_apply.name
  policy_arn = "arn:aws:iam::aws:policy/AdministratorAccess"
}
