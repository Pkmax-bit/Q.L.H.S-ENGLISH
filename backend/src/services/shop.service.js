const { supabase } = require('../config/database');
const shopPoints = require('./shopPoints.service');
const harvestDefault = require('../data/harvestShotDefaultContent');

const DEFAULT_PACKS = {
  'harvest-shot': harvestDefault,
};

function validateContentPayload(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    const err = new Error('Payload không hợp lệ');
    err.status = 400;
    throw err;
  }
  const { fillStages, vocabStages, bossDefs } = payload;
  if (!Array.isArray(fillStages) || !Array.isArray(vocabStages) || !Array.isArray(bossDefs)) {
    const err = new Error('Cần fillStages, vocabStages, bossDefs (mảng)');
    err.status = 400;
    throw err;
  }
  if (fillStages.length < 1 || vocabStages.length < 1) {
    const err = new Error('Cần ít nhất 1 màn Fill và 1 màn Vocab');
    err.status = 400;
    throw err;
  }
  for (const s of fillStages) {
    if (!s?.id || !s?.title || !Array.isArray(s.questions) || s.questions.length < 1) {
      const err = new Error(`Màn Fill không hợp lệ: ${s?.id || '?'}`);
      err.status = 400;
      throw err;
    }
  }
  for (const s of vocabStages) {
    if (!s?.id || !s?.title || !Array.isArray(s.words) || s.words.length < 1) {
      const err = new Error(`Màn Vocab không hợp lệ: ${s?.id || '?'}`);
      err.status = 400;
      throw err;
    }
  }
  return {
    fillStages,
    vocabStages,
    bossDefs,
  };
}

async function getGameContent(slug, user) {
  const defaults = DEFAULT_PACKS[slug] || null;

  // Students must own the game; staff can always read
  if (user?.role === 'student') {
    const access = await assertOwned(user.id, slug);
    if (!access.owned) {
      const err = new Error('Bạn chưa mua game này');
      err.status = 403;
      throw err;
    }
  } else if (user?.role !== 'admin' && user?.role !== 'teacher') {
    const err = new Error('Không có quyền');
    err.status = 403;
    throw err;
  }

  const { data, error } = await supabase
    .from('shop_game_content')
    .select('slug, payload, updated_at, updated_by')
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw error;

  if (data?.payload && typeof data.payload === 'object' && (data.payload.fillStages || data.payload.vocabStages)) {
    return {
      slug,
      payload: data.payload,
      updated_at: data.updated_at,
      updated_by: data.updated_by,
      is_default: false,
    };
  }

  if (!defaults) {
    const err = new Error('Không có nội dung cho game này');
    err.status = 404;
    throw err;
  }

  return {
    slug,
    payload: defaults,
    updated_at: null,
    updated_by: null,
    is_default: true,
  };
}

async function putGameContent(slug, payload, userId) {
  if (!DEFAULT_PACKS[slug] && slug !== 'harvest-shot') {
    // Allow saving known slugs only for now
    const item = await getItemBySlug(slug);
    if (!item) {
      const err = new Error('Không tìm thấy game');
      err.status = 404;
      throw err;
    }
  }
  const clean = validateContentPayload(payload);
  const raw = JSON.stringify(clean);
  if (raw.length > 800000) {
    const err = new Error('Nội dung quá lớn');
    err.status = 413;
    throw err;
  }
  const { data, error } = await supabase
    .from('shop_game_content')
    .upsert(
      {
        slug,
        payload: clean,
        updated_by: userId || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'slug' },
    )
    .select('slug, payload, updated_at, updated_by')
    .single();
  if (error) throw error;
  return { ...data, is_default: false };
}

async function resetGameContent(slug, userId) {
  const defaults = DEFAULT_PACKS[slug];
  if (!defaults) {
    const err = new Error('Không có pack mặc định');
    err.status = 404;
    throw err;
  }
  return putGameContent(slug, defaults, userId);
}

async function listItems(userId, role) {
  const { data: items, error } = await supabase
    .from('shop_items')
    .select('id, slug, title, description, cost, play_path, cover_url, is_active, sort_order')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });
  if (error) throw error;

  let ownedIds = new Set();
  if (userId && role === 'student') {
    const { data: purchases, error: pErr } = await supabase
      .from('student_shop_purchases')
      .select('item_id')
      .eq('student_id', userId);
    if (pErr) throw pErr;
    ownedIds = new Set((purchases || []).map((p) => String(p.item_id)));
  }

  return (items || []).map((item) => ({
    ...item,
    owned: ownedIds.has(String(item.id)),
  }));
}

async function getItemBySlug(slug) {
  const { data, error } = await supabase
    .from('shop_items')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function purchaseItem(studentId, itemId) {
  const { data: item, error: iErr } = await supabase
    .from('shop_items')
    .select('*')
    .eq('id', itemId)
    .eq('is_active', true)
    .single();
  if (iErr || !item) {
    const err = new Error('Không tìm thấy sản phẩm');
    err.status = 404;
    throw err;
  }

  const { data: existing } = await supabase
    .from('student_shop_purchases')
    .select('id')
    .eq('student_id', studentId)
    .eq('item_id', itemId)
    .maybeSingle();
  if (existing) {
    const err = new Error('Bạn đã sở hữu game này');
    err.status = 409;
    throw err;
  }

  const wallet = await shopPoints.getWallet(studentId);
  const cost = Number(item.cost) || 0;
  if (wallet.balance < cost) {
    const err = new Error(`Không đủ điểm sao (cần ${cost}, đang có ${wallet.balance})`);
    err.status = 400;
    throw err;
  }

  const newBalance = wallet.balance - cost;

  const { error: updErr } = await supabase
    .from('profiles')
    .update({
      shop_points_balance: newBalance,
      updated_at: new Date().toISOString(),
    })
    .eq('id', studentId)
    .gte('shop_points_balance', cost);
  if (updErr) throw updErr;

  // Re-check balance after optimistic update race
  const { data: after, error: aErr } = await supabase
    .from('profiles')
    .select('shop_points_balance')
    .eq('id', studentId)
    .single();
  if (aErr) throw aErr;
  if (Number(after.shop_points_balance) !== newBalance && Number(after.shop_points_balance) < 0) {
    await supabase
      .from('profiles')
      .update({ shop_points_balance: wallet.balance })
      .eq('id', studentId);
    const err = new Error('Không đủ điểm sao');
    err.status = 400;
    throw err;
  }

  const { data: purchase, error: pErr } = await supabase
    .from('student_shop_purchases')
    .insert({
      student_id: studentId,
      item_id: itemId,
      cost_paid: cost,
    })
    .select('*')
    .single();

  if (pErr) {
    // Rollback balance on unique conflict / failure
    await supabase
      .from('profiles')
      .update({ shop_points_balance: wallet.balance })
      .eq('id', studentId);
    if (pErr.code === '23505') {
      const err = new Error('Bạn đã sở hữu game này');
      err.status = 409;
      throw err;
    }
    throw pErr;
  }

  await supabase.from('student_point_ledger').insert({
    student_id: studentId,
    delta: -cost,
    balance_after: newBalance,
    reason: 'purchase',
    note: `Mua ${item.title}`,
  });

  return {
    purchase,
    item: { ...item, owned: true },
    balance: newBalance,
    earned: wallet.earned,
  };
}

async function assertOwned(studentId, slug) {
  const item = await getItemBySlug(slug);
  if (!item) {
    const err = new Error('Không tìm thấy game');
    err.status = 404;
    throw err;
  }
  const { data: purchase } = await supabase
    .from('student_shop_purchases')
    .select('id')
    .eq('student_id', studentId)
    .eq('item_id', item.id)
    .maybeSingle();
  return { item, owned: !!purchase };
}

async function getGameSave(studentId, slug) {
  const access = await assertOwned(studentId, slug);
  if (!access.owned) {
    const err = new Error('Bạn chưa mua game này');
    err.status = 403;
    throw err;
  }

  const { data, error } = await supabase
    .from('student_game_saves')
    .select('item_slug, save_data, updated_at')
    .eq('student_id', studentId)
    .eq('item_slug', slug)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

async function upsertGameSave(studentId, slug, saveData) {
  const access = await assertOwned(studentId, slug);
  if (!access.owned) {
    const err = new Error('Bạn chưa mua game này');
    err.status = 403;
    throw err;
  }
  if (!saveData || typeof saveData !== 'object' || Array.isArray(saveData)) {
    const err = new Error('Dữ liệu save không hợp lệ');
    err.status = 400;
    throw err;
  }

  // Giới hạn kích thước ~200KB JSON
  const raw = JSON.stringify(saveData);
  if (raw.length > 200000) {
    const err = new Error('Save quá lớn');
    err.status = 413;
    throw err;
  }

  const { data, error } = await supabase
    .from('student_game_saves')
    .upsert(
      {
        student_id: studentId,
        item_slug: slug,
        save_data: saveData,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'student_id,item_slug' },
    )
    .select('item_slug, save_data, updated_at')
    .single();
  if (error) throw error;
  return data;
}

async function deleteGameSave(studentId, slug) {
  const access = await assertOwned(studentId, slug);
  if (!access.owned) {
    const err = new Error('Bạn chưa mua game này');
    err.status = 403;
    throw err;
  }
  const { error } = await supabase
    .from('student_game_saves')
    .delete()
    .eq('student_id', studentId)
    .eq('item_slug', slug);
  if (error) throw error;
  return { deleted: true };
}

module.exports = {
  listItems,
  getItemBySlug,
  purchaseItem,
  assertOwned,
  getGameSave,
  upsertGameSave,
  deleteGameSave,
  getGameContent,
  putGameContent,
  resetGameContent,
  getWallet: shopPoints.getWallet,
  listLedger: shopPoints.listLedger,
};
