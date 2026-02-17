-- ============================================
-- PHASE 5 : AUDIT LOGS ET VARIANTES
-- ============================================

-- 1. Table des logs d'audit
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "userId" UUID REFERENCES users(id) ON DELETE SET NULL,
    "userName" VARCHAR(255) NOT NULL,
    action VARCHAR(50) NOT NULL,
    resource VARCHAR(100) NOT NULL,
    "resourceId" UUID,
    details TEXT,
    "oldData" JSONB,
    "newData" JSONB,
    "ipAddress" VARCHAR(45),
    "userAgent" TEXT,
    timestamp TIMESTAMP DEFAULT NOW()
);

-- Index pour les recherches
CREATE INDEX idx_audit_user ON audit_logs("userId");
CREATE INDEX idx_audit_resource ON audit_logs(resource);
CREATE INDEX idx_audit_action ON audit_logs(action);
CREATE INDEX idx_audit_timestamp ON audit_logs(timestamp);

-- 2. Table des variantes de produits
CREATE TABLE IF NOT EXISTS product_variants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "productId" UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    sku VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    size VARCHAR(50),
    color VARCHAR(50),
    material VARCHAR(100),
    weight DECIMAL(10,2),
    "priceModifier" DECIMAL(10,0) DEFAULT 0,
    stock INTEGER DEFAULT 0,
    images TEXT[],
    "isActive" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP DEFAULT NOW(),
    "updatedAt" TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_variants_product ON product_variants("productId");
CREATE INDEX idx_variants_sku ON product_variants(sku);

-- Trigger pour updatedAt
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_product_variants_updated_at
    BEFORE UPDATE ON product_variants
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 3. Ajouter la colonne variantId à order_items
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS "variantId" UUID REFERENCES product_variants(id) ON DELETE SET NULL;

-- 4. Ajouter la colonne discountAmount à orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS "discountAmount" DECIMAL(10,0) DEFAULT 0;

-- 5. Ajouter plus de permissions pour la Phase 5
INSERT INTO permissions (id, name, resource, action, description) VALUES
(uuid_generate_v4(), 'reports.export', 'reports', 'export', 'Exporter les rapports'),
(uuid_generate_v4(), 'settings.manage', 'settings', 'manage', 'Gérer les paramètres'),
(uuid_generate_v4(), 'audit.read', 'audit', 'read', 'Consulter les logs d\'audit')
ON CONFLICT (name) DO NOTHING;

-- 6. Ajouter les nouvelles permissions aux rôles
DO $$
DECLARE
    super_admin_id UUID;
    admin_id UUID;
    perm_record RECORD;
BEGIN
    SELECT id INTO super_admin_id FROM roles WHERE name = 'super_admin';
    SELECT id INTO admin_id FROM roles WHERE name = 'admin';

    -- Donner toutes les nouvelles permissions à super_admin
    FOR perm_record IN SELECT id FROM permissions WHERE name IN ('reports.export', 'settings.manage', 'audit.read') LOOP
        INSERT INTO role_permissions ("roleId", "permissionId") 
        VALUES (super_admin_id, perm_record.id)
        ON CONFLICT DO NOTHING;
    END LOOP;

    -- Donner certaines permissions à admin
    FOR perm_record IN SELECT id FROM permissions WHERE name IN ('reports.export', 'audit.read') LOOP
        INSERT INTO role_permissions ("roleId", "permissionId") 
        VALUES (admin_id, perm_record.id)
        ON CONFLICT DO NOTHING;
    END LOOP;
END $$;