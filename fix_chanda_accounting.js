const fs = require('fs');

let code = fs.readFileSync('app.js', 'utf8');

// Update isMemberChanda in loadReports to also include 'Subscription'
const oldIsMemberChanda = `const isMemberChanda = (tx.member_id && state.members.some(m => m.id === tx.member_id)) || 
                                   tx.category === 'সদস্য চাঁদা' || 
                                   tx.category === 'মাসিক চাঁদা' || 
                                   tx.is_member_fee;`;

const newIsMemberChanda = `const isMemberChanda = (tx.member_id && state.members.some(m => m.id === tx.member_id)) || 
                                   tx.category === 'Subscription' ||
                                   tx.category === 'সদস্য চাঁদা' || 
                                   tx.category === 'মাসিক চাঁদা' || 
                                   tx.is_member_fee;`;

if (code.includes(oldIsMemberChanda)) {
    code = code.replace(oldIsMemberChanda, newIsMemberChanda);
    fs.writeFileSync('app.js', code, 'utf8');
    console.log('✅ loadReports updated with Subscription category support');
} else {
    console.log('ℹ️ Already updated or matched');
}
