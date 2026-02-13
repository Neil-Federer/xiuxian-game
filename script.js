// --- 游戏配置与常量 ---
const REALMS = [
    { name: "练气", baseMult: 1, maxQi: 100 },
    { name: "筑基", baseMult: 1.5, maxQi: 500 },
    { name: "金丹", baseMult: 2.2, maxQi: 2000 },
    { name: "元婴", baseMult: 3.5, maxQi: 10000 },
    { name: "炼虚", baseMult: 5.5, maxQi: 50000 },
    { name: "渡劫", baseMult: 9, maxQi: 200000 },
    { name: "大乘", baseMult: 15, maxQi: 1000000 },
    { name: "仙人", baseMult: 25, maxQi: 999999999 }
];

const SPIRIT_ROOTS = [
    { name: "天灵根", speedMult: 2.0 },
    { name: "双灵根", speedMult: 1.5 },
    { name: "三灵根", speedMult: 1.2 },
    { name: "四灵根", speedMult: 1.0 },
    { name: "五灵根", speedMult: 0.8 },
    { name: "空灵根", speedMult: 0.5 }
];

const SEASONS = ["春", "夏", "秋", "冬"];

// --- 游戏状态类 ---
class GameState {
    constructor() {
        this.player = {
            name: "",
            age: 0, // 以季度为单位，计算时 /4
            realmIdx: 0,
            currentQi: 0,
            stats: {
                con: 0, // 体魄
                root: 0, // 根骨
                spirit: 0, // 灵力
                luck: 0, // 福运
                speed: 0 // 速度
            },
            spiritRoot: null, // { name, speedMult }
            creationPoints: 20 // 初始分配点数
        };
        
        this.time = {
            year: 1,
            quarter: 0 // 0-3: 春夏秋冬
        };
        this.eventsThisYear = 0;
        
        this.actionPoints = 3;
        this.logs = [];
    }

    // 获取当前境界信息
    get realm() {
        return REALMS[this.player.realmIdx];
    }

    // 获取二级属性
    get derivedStats() {
        const rMult = this.realm.baseMult;
        return {
            maxHp: Math.floor(this.player.stats.con * 10 * rMult),
            defense: Math.floor(this.player.stats.root * 2 * rMult),
            attack: Math.floor(this.player.stats.spirit * 3 * rMult),
            critRate: Math.min(100, (this.player.stats.luck * 0.1).toFixed(1)),
            combatSpeed: Math.floor(this.player.stats.speed * rMult),
            cultivationSpeed: Math.floor((this.player.stats.spirit * 0.5 + 10) * this.player.spiritRoot.speedMult * rMult)
        };
    }
}

// --- 全局变量 ---
let game = new GameState();

// --- 界面元素引用 ---
const ui = {
    // Info
    playerName: document.getElementById('player-name'),
    playerRealm: document.getElementById('player-realm'),
    playerAge: document.getElementById('player-age'),
    qiBar: document.getElementById('qi-bar'),
    qiText: document.getElementById('qi-text'),
    
    // Stats
    statCon: document.getElementById('stat-constitution'),
    statRoot: document.getElementById('stat-rootbone'),
    statSpirit: document.getElementById('stat-spirit'),
    statLuck: document.getElementById('stat-luck'),
    statSpeed: document.getElementById('stat-speed'),
    
    attrHp: document.getElementById('attr-hp'),
    attrDef: document.getElementById('attr-def'),
    attrAtk: document.getElementById('attr-atk'),
    attrCult: document.getElementById('attr-cultivation'),
    attrRoot: document.getElementById('attr-root'),

    // Time & Actions
    currentYear: document.getElementById('current-year'),
    currentSeason: document.getElementById('current-season'),
    actionPoints: document.getElementById('action-points'),
    actionBtns: document.querySelectorAll('.action-btn'),

    // Logs
    logPanel: document.getElementById('game-log'),

    // Modals
    modalCreation: document.getElementById('modal-creation'),
    modalEvent: document.getElementById('modal-event')
};

// --- 初始化与角色创建 ---
function initGame() {
    // 绑定初始点数分配逻辑
    bindCreationLogic();
    // 绑定行动按钮
    bindActionButtons();
}

function bindCreationLogic() {
    const stats = ['con', 'root', 'spirit', 'luck', 'speed'];
    const limits = { min: 1, max: 20 }; // 单项上限，防止全部加到一个
    let tempStats = { con: 10, root: 10, spirit: 10, luck: 10, speed: 10 };
    let points = 20;

    function updateDisplay() {
        document.getElementById('points-remaining').textContent = points;
        stats.forEach(s => {
            document.getElementById(`alloc-${s}`).textContent = tempStats[s];
        });
    }

    document.querySelectorAll('.alloc-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const stat = e.target.dataset.stat;
            const isPlus = e.target.classList.contains('plus');

            if (isPlus) {
                if (points > 0 && tempStats[stat] < limits.max) {
                    tempStats[stat]++;
                    points--;
                }
            } else {
                if (tempStats[stat] > limits.min) {
                    tempStats[stat]--;
                    points++;
                }
            }
            updateDisplay();
        });
    });

    document.getElementById('btn-random-name').addEventListener('click', () => {
        const names = ["韩立", "白小纯", "方源", "王林", "叶凡", "萧炎", "林动", "石昊", "东方不败", "龙傲天"];
        document.getElementById('input-name').value = names[Math.floor(Math.random() * names.length)];
    });

    document.getElementById('btn-random-stats').addEventListener('click', () => {
        // 重置为基础值
        tempStats = { con: 10, root: 10, spirit: 10, luck: 10, speed: 10 };
        points = 20;
        // 将 20 点随机分配到各属性（每项不超过 20）
        for (let i = 0; i < 20; i++) {
            const available = stats.filter(s => tempStats[s] < limits.max);
            const stat = available[Math.floor(Math.random() * available.length)];
            tempStats[stat]++;
            points--;
        }
        points = 0;
        updateDisplay();
    });

    document.getElementById('btn-start-game').addEventListener('click', () => {
        const name = document.getElementById('input-name').value.trim() || "无名氏";
        if (points !== 0) {
            alert("请将属性点分配完毕！");
            return;
        }
        
        // 初始化角色
        game.player.name = name;
        game.player.stats = { ...tempStats };
        // 随机灵根 (加权：双灵根、三灵根概率较高)
        const rand = Math.random();
        let rootIdx = 0;
        if (rand < 0.05) rootIdx = 0; // 天灵根 5%
        else if (rand < 0.20) rootIdx = 1; // 双 15%
        else if (rand < 0.50) rootIdx = 2; // 三 30%
        else if (rand < 0.80) rootIdx = 3; // 四 30%
        else if (rand < 0.95) rootIdx = 4; // 五 15%
        else rootIdx = 5; // 空 5%
        
        game.player.spiritRoot = SPIRIT_ROOTS[rootIdx];
        
        ui.modalCreation.classList.add('hidden');
        addLog(`道友【${name}】踏入仙途，测得灵根为【${game.player.spiritRoot.name}】！`, 'system');
        updateUI();
    });

    updateDisplay();
}

// --- 核心逻辑 ---

function updateUI() {
    // Header
    ui.playerName.textContent = game.player.name;
    ui.playerRealm.textContent = game.realm.name;
    ui.playerAge.textContent = `${Math.floor(game.player.age / 4)}岁`;
    
    // Qi
    const pct = Math.min(100, (game.player.currentQi / game.realm.maxQi) * 100).toFixed(1);
    ui.qiBar.style.width = `${pct}%`;
    ui.qiText.textContent = `${Math.floor(game.player.currentQi)}/${game.realm.maxQi}`;

    // Stats
    ui.statCon.textContent = game.player.stats.con;
    ui.statRoot.textContent = game.player.stats.root;
    ui.statSpirit.textContent = game.player.stats.spirit;
    ui.statLuck.textContent = game.player.stats.luck;
    ui.statSpeed.textContent = game.player.stats.speed;

    const dStats = game.derivedStats;
    ui.attrHp.textContent = `${dStats.maxHp}/${dStats.maxHp}`;
    ui.attrDef.textContent = dStats.defense;
    ui.attrAtk.textContent = dStats.attack;
    ui.attrCult.textContent = `${dStats.cultivationSpeed}/季`;
    ui.attrRoot.textContent = game.player.spiritRoot.name;

    // Time
    ui.currentYear.textContent = `第${game.time.year}年`;
    ui.currentSeason.textContent = SEASONS[game.time.quarter] + "季";
    ui.actionPoints.textContent = game.actionPoints;

    // Buttons
    ui.actionBtns.forEach(btn => {
        btn.disabled = game.actionPoints <= 0;
    });
}

function addLog(text, type = '') {
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    entry.textContent = `[${game.time.year}年${SEASONS[game.time.quarter]}] ${text}`;
    ui.logPanel.appendChild(entry);
    
    // 强制滚动到底部（移动端兼容）
    const scrollToBottom = () => {
        const panel = ui.logPanel;
        if (!panel) return;
        
        // 计算应该滚动到的位置
        const scrollHeight = panel.scrollHeight;
        const clientHeight = panel.clientHeight;
        const maxScroll = scrollHeight - clientHeight;
        
        // 强制设置scrollTop到最大值
        if (maxScroll > 0) {
            panel.scrollTop = maxScroll;
        } else {
            panel.scrollTop = scrollHeight;
        }
        
        // 使用scrollTo作为备用方法
        try {
            panel.scrollTo({
                top: panel.scrollHeight,
                left: 0,
                behavior: 'auto'
            });
        } catch (e) {
            // 如果scrollTo不支持，使用scrollTop
            panel.scrollTop = panel.scrollHeight;
        }
    };
    
    // 立即尝试滚动
    scrollToBottom();
    
    // DOM更新后滚动（使用双重requestAnimationFrame确保渲染完成）
    requestAnimationFrame(() => {
        scrollToBottom();
        requestAnimationFrame(() => {
            scrollToBottom();
            // 多次延迟滚动，确保移动端浏览器完成布局和渲染
            setTimeout(() => {
                scrollToBottom();
                setTimeout(() => {
                    scrollToBottom();
                    setTimeout(() => {
                        scrollToBottom();
                    }, 100);
                }, 50);
            }, 10);
        });
    });
}

function gainQi(amount, source) {
    const actualAmount = Math.floor(amount);
    game.player.currentQi += actualAmount;
    addLog(`通过${source}获得了 ${actualAmount} 点灵气。`, 'gain');
    
    // 检查突破
    if (game.player.currentQi >= game.realm.maxQi) {
        if (game.player.realmIdx < REALMS.length - 1) {
            game.player.currentQi -= game.realm.maxQi;
            game.player.realmIdx++;
            addLog(`========== 境界突破！晋升为【${game.realm.name}】！各项属性大幅提升！ ==========`, 'event');
            // 突破奖励属性
            game.player.stats.con += 5;
            game.player.stats.root += 5;
            game.player.stats.spirit += 5;
            game.player.stats.speed += 5;
        } else {
            game.player.currentQi = game.realm.maxQi;
            addLog(`修为已至化境，无法再提升境界了！`, 'system');
        }
    }
    updateUI();
}

// --- 行动逻辑 ---
function bindActionButtons() {
    ui.actionBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            if (game.actionPoints <= 0) return;
            const action = btn.dataset.action;
            performAction(action);
        });
    });
}

function performAction(actionType) {
    game.actionPoints--;
    
    const dStats = game.derivedStats;
    const baseQi = dStats.cultivationSpeed;
    let qiMult = 1.0;
    let logText = "";
    let statRewards = [];

    // 随机事件触发 (行动后反馈)
    const roll = Math.random();
    
    switch (actionType) {
        case 'retreat': // 闭关
            qiMult = 1.2;
            logText = "你闭关修炼，两耳不闻窗外事。";
            if (roll < 0.2) {
                logText += " 忽有感悟，灵力大增！";
                game.player.stats.spirit += 1;
                statRewards.push("灵力+1");
            }
            break;
        case 'adventure': // 历练
            // 历练灵气波动大
            qiMult = 0.5 + Math.random(); // 0.5 ~ 1.5
            logText = "你外出历练，";
            if (roll < 0.3) {
                // 战斗触发概率
                triggerCombat(); 
                // 战斗是同步还是异步？为了简单，这里先结算灵气，战斗在log里体现
            } else if (roll < 0.6) {
                logText += "误入一处荒废遗迹，寻得几株灵草。";
                game.player.stats.con += 2;
                game.player.stats.root += 1;
                statRewards.push("体魄+2, 根骨+1");
            } else {
                logText += "虽然没有大机缘，但也增长了见识。";
            }
            break;
        case 'visit': // 访友
            qiMult = 1.0;
            logText = "你拜访了昔日道友，";
            if (roll < 0.4) {
                logText += "两人坐而论道，受益匪浅。";
                game.player.stats.spirit += 1;
                statRewards.push("灵力+1");
            } else {
                logText += "把酒言欢，心情舒畅。";
            }
            break;
        case 'comprehend': // 参悟
            qiMult = 1.1;
            logText = "你观摩天地法则，";
            if (roll < 0.3) {
                logText += "隐约摸索到一丝大道轨迹。";
                game.player.stats.speed += 2;
                statRewards.push("速度+2");
            } else {
                logText += "虽无顿悟，但也稳固了道心。";
            }
            break;
        case 'play': // 玩乐
            qiMult = 0.55;
            logText = "你游山玩水，";
            if (roll < 0.3) {
                logText += "偶遇瑞兽赐福。";
                game.player.stats.luck += 2;
                statRewards.push("福运+2");
            } else {
                logText += "身心得到了极大的放松。";
            }
            break;
        case 'date': // CPDD
            qiMult = 0.55;
            logText = "你尝试寻找道侣，";
            if (roll < 0.2) {
                logText += "遇到一位倾心之人，互赠信物。";
                game.player.stats.luck += 1;
                game.player.stats.spirit += 1;
                statRewards.push("福运+1, 灵力+1");
            } else {
                logText += "可惜缘分未到。";
            }
            break;
    }

    addLog(logText + (statRewards.length ? ` (${statRewards.join(', ')})` : ""));
    gainQi(baseQi * qiMult, {
        'retreat': '闭关', 'adventure': '历练', 'visit': '访友',
        'comprehend': '参悟', 'play': '玩乐', 'date': 'CPDD'
    }[actionType]);

    updateUI();
    checkTurnEnd();
}

function checkTurnEnd() {
    if (game.actionPoints <= 0) {
        // 季度结束，进入下一季度
        setTimeout(() => {
            nextQuarter();
        }, 800);
    }
}

function nextQuarter() {
    game.time.quarter++;
    if (game.time.quarter >= 4) {
        game.time.quarter = 0;
        game.time.year++;
        game.player.age += 4; // 每年加4岁（逻辑上季度累计）
        game.eventsThisYear = 0; // 重置年度事件计数
        addLog(`=== 第${game.time.year}年到了 ===`, 'system');
        
        // 年初事件
        if (game.time.year > 1) {
            triggerAnnualEvent();
        }
    } else {
        game.player.age++;
    }

    game.actionPoints = 3;
    updateUI();

    // 季度初概率事件 (每年不超过2次)
    if (game.eventsThisYear < 2 && Math.random() < 0.3) {
        triggerRandomEvent();
        game.eventsThisYear++;
    }
}

// --- 战斗系统 ---
class Enemy {
    constructor(level) {
        // level 约等于 year * 0.5 + realmIdx * 2
        const scaling = 1 + (level * 0.2);
        
        const names = ["黑风狼", "赤炎虎", "九头蛇", "独角兕", "毕方", "饕餮幼崽", "雷震子残魂"];
        this.name = names[Math.floor(Math.random() * names.length)];
        
        this.hp = Math.floor(100 * scaling);
        this.maxHp = this.hp;
        this.atk = Math.floor(15 * scaling);
        this.def = Math.floor(5 * scaling);
        this.speed = Math.floor(10 * scaling);
    }
}

function triggerCombat() {
    // 简单回合制战斗
    const diff = game.player.realmIdx * 2 + Math.floor(game.time.year / 5);
    const enemy = new Enemy(diff);
    
    addLog(`遭遇强敌【${enemy.name}】！战斗一触即发！`, 'combat');
    
    const pStats = game.derivedStats;
    let pHp = pStats.maxHp;
    let turn = 1;
    
    let combatLog = "";
    
    // 战斗循环（简化，直接出结果）
    while (pHp > 0 && enemy.hp > 0 && turn < 50) {
        // 速度判断先手
        const playerFirst = pStats.combatSpeed >= enemy.speed;
        
        if (playerFirst) {
            // 玩家攻击
            const dmg = Math.max(1, pStats.attack - enemy.def);
            // 暴击
            const isCrit = Math.random() * 100 < pStats.critRate;
            const finalDmg = isCrit ? Math.floor(dmg * 1.5) : dmg;
            enemy.hp -= finalDmg;
            // combatLog += `你攻击造成 ${finalDmg}${isCrit?'(暴击)':''} 伤害。`;
            if (enemy.hp <= 0) break;
            
            // 敌人攻击
            const eDmg = Math.max(1, enemy.atk - pStats.defense);
            pHp -= eDmg;
        } else {
            // 敌人攻击
            const eDmg = Math.max(1, enemy.atk - pStats.defense);
            pHp -= eDmg;
            if (pHp <= 0) break;
            
            // 玩家攻击
            const dmg = Math.max(1, pStats.attack - enemy.def);
            const isCrit = Math.random() * 100 < pStats.critRate;
            const finalDmg = isCrit ? Math.floor(dmg * 1.5) : dmg;
            enemy.hp -= finalDmg;
        }
        turn++;
    }

    if (pHp > 0) {
        addLog(`经过${turn}回合激战，你战胜了${enemy.name}！`, 'combat');
        // 战利品
        const rewardCon = Math.floor(Math.random() * 2) + 1;
        game.player.stats.con += rewardCon;
        addLog(`战斗中锤炼了肉身，体魄+${rewardCon}`, 'gain');
    } else {
        addLog(`你不敌${enemy.name}，重伤逃遁... (全属性小幅下降)`, 'combat');
        game.player.stats.con = Math.max(1, game.player.stats.con - 1);
        game.player.stats.spirit = Math.max(1, game.player.stats.spirit - 1);
    }
}

// --- 事件系统 ---
const EVENTS = [
    {
        title: "仙人遗迹",
        desc: "传闻附近山脉有仙人洞府现世，霞光万丈。",
        options: [
            { text: "冒险一探", check: "luck", val: 20, success: { stat: "spirit", val: 5, msg: "获得上古功法残篇，灵力大增！" }, fail: { msg: "被守护阵法击伤，无功而返。" } },
            { text: "不去凑热闹", success: { stat: "con", val: 1, msg: "潜心修炼，心境平和。" } }
        ]
    },
    {
        title: "兽潮来袭",
        desc: "无数妖兽冲击村落，生灵涂炭。",
        options: [
            { text: "挺身而出", check: "combat", success: { stat: "root", val: 3, msg: "斩杀妖兽首领，受凡人供奉，根骨提升。" }, fail: { msg: "妖兽太多，只能勉强自保。" } },
            { text: "暂避锋芒", success: { msg: "你躲过了兽潮。" } }
        ]
    },
    {
        title: "神秘行商",
        desc: "遇到一位神秘的云游商人，兜售奇珍异宝。",
        options: [
            { text: "购买丹药", check: "luck", val: 15, success: { stat: "con", val: 3, msg: "丹药药力纯正，体魄增强！" }, fail: { msg: "买到了假药，吃了拉肚子。" } },
            { text: "无视", success: { msg: "你径直走开了。" } }
        ]
    }
];

function triggerRandomEvent() {
    const event = EVENTS[Math.floor(Math.random() * EVENTS.length)];
    showEventModal(event);
}

function triggerAnnualEvent() {
    // 简单的年度挑战
    const event = {
        title: "年度瓶颈",
        desc: "修仙路漫漫，每年此时心魔易生。",
        options: [
            { text: "静心抵抗", check: "spirit", val: game.player.stats.spirit, success: { stat: "spirit", val: 2, msg: "战胜心魔，道心更加稳固。" }, fail: { msg: "心魔难除，修为停滞。" } }
        ]
    };
    showEventModal(event);
}

function showEventModal(event) {
    const modal = ui.modalEvent;
    const titleEl = document.getElementById('event-title');
    const descEl = document.getElementById('event-description');
    const choicesEl = document.getElementById('event-choices');

    titleEl.textContent = event.title;
    descEl.textContent = event.desc;
    choicesEl.innerHTML = "";

    event.options.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = "choice-btn";
        btn.textContent = opt.text;
        btn.onclick = () => {
            handleEventChoice(opt);
            modal.classList.add('hidden');
        };
        choicesEl.appendChild(btn);
    });

    modal.classList.remove('hidden');
}

function handleEventChoice(option) {
    let success = true;
    
    if (option.check) {
        if (option.check === 'luck') {
            success = (Math.random() * 100 + game.player.stats.luck) > (50 + Math.random() * 50);
        } else if (option.check === 'combat') {
             // 简单判定战力
             const power = game.derivedStats.attack + game.derivedStats.defense;
             success = power > (game.time.year * 10);
        } else if (option.check === 'spirit') {
            // 这里的 val 是阈值，其实逻辑可以更复杂
            success = game.player.stats.spirit > 5; 
        }
    }

    const result = success ? option.success : (option.fail || option.success);
    
    if (result) {
        addLog(result.msg, 'event');
        if (result.stat) {
            game.player.stats[result.stat] = (game.player.stats[result.stat] || 0) + result.val;
            addLog(`${translateStat(result.stat)}+${result.val}`, 'gain');
        }
    }
    updateUI();
}

function translateStat(key) {
    const map = {
        con: '体魄', root: '根骨', spirit: '灵力', luck: '福运', speed: '速度'
    };
    return map[key] || key;
}

// --- 启动 ---
initGame();
