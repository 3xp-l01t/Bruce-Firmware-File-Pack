// Game Cờ Vua vs Bot - Bruce JavaScript
// Theo chuẩn Bruce JS API

var display = require('display');
var keyboard = require('keyboard');
var device = require('device');

var screenWidth = display.width();
var screenHeight = display.height();

// Kích thước bàn cờ
var CELL_SIZE = Math.floor(Math.min(screenWidth, screenHeight - 30) / 8);
var BOARD_X = Math.floor((screenWidth - CELL_SIZE * 8) / 2);
var BOARD_Y = 20;

// Màu sắc
var WHITE = display.color(240, 217, 181);
var BLACK = display.color(181, 136, 99);
var SELECTED = display.color(127, 201, 127);
var VALID = display.color(255, 215, 0);
var CURSOR = display.color(100, 100, 255);
var TEXT = display.color(255, 255, 255);
var BG = display.color(0, 0, 0);

// Unicode quân cờ
var PIECES = {
    'K': 'K', 'Q': 'Q', 'R': 'R', 'B': 'B', 'N': 'N', 'P': 'P',
    'k': 'k', 'q': 'q', 'r': 'r', 'b': 'b', 'n': 'n', 'p': 'p'
};

// Giá trị quân cờ cho AI
var VALUES = {
    'P': 100, 'N': 320, 'B': 330, 'R': 500, 'Q': 900, 'K': 20000,
    'p': -100, 'n': -320, 'b': -330, 'r': -500, 'q': -900, 'k': -20000
};

// Game state
var board = [];
var selected = null;
var player = 'white';
var moves = 0;
var gameOver = false;
var validMoves = [];
var cursor = {row: 7, col: 4};
var redraw = true;
var difficulty = 2;

// Khởi tạo bàn cờ
function initBoard() {
    board = [
        ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
        ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
        ['', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', ''],
        ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
        ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R']
    ];
    selected = null;
    player = 'white';
    moves = 0;
    gameOver = false;
    validMoves = [];
    cursor = {row: 7, col: 4};
    redraw = true;
}

// Vẽ bàn cờ
function drawBoard() {
    if (!redraw) return;
    
    display.drawFillRect(0, 0, screenWidth, screenHeight, BG);
    
    // Header
    display.setTextSize(1);
    var turnText = player === 'white' ? 'White (You)' : 'Black (Bot)';
    display.setTextColor(TEXT);
    display.drawString(turnText + ' - Move: ' + Math.floor(moves / 2), 2, 2);
    
    var battery = device.getBatteryCharge();
    display.drawString('Bat: ' + battery + '%', screenWidth - 60, 2);
    
    // Vẽ từng ô
    var i, j, x, y, color, piece;
    for (i = 0; i < 8; i++) {
        for (j = 0; j < 8; j++) {
            x = BOARD_X + j * CELL_SIZE;
            y = BOARD_Y + i * CELL_SIZE;
            
            // Xác định màu ô
            if (selected && selected.row === i && selected.col === j) {
                color = SELECTED;
            } else if (isValidMove(i, j)) {
                color = VALID;
            } else if (cursor.row === i && cursor.col === j) {
                color = CURSOR;
            } else {
                color = (i + j) % 2 === 0 ? WHITE : BLACK;
            }
            
            display.drawFillRect(x, y, CELL_SIZE, CELL_SIZE, color);
            
            // Vẽ quân cờ
            piece = board[i][j];
            if (piece !== '') {
                display.setTextSize(2);
                var pieceColor = piece === piece.toUpperCase() ? display.color(255, 255, 255) : display.color(0, 0, 0);
                display.setTextColor(pieceColor);
                display.drawString(PIECES[piece], x + 2, y + 2);
            }
        }
    }
    
    // Footer
    display.setTextSize(1);
    display.setTextColor(TEXT);
    display.drawString('Prev/Next:Move Sel:Pick Esc:Exit', 2, screenHeight - 10);
    
    redraw = false;
}

// Kiểm tra nước đi hợp lệ
function isValidMove(r, c) {
    var i;
    for (i = 0; i < validMoves.length; i++) {
        if (validMoves[i].row === r && validMoves[i].col === c) {
            return true;
        }
    }
    return false;
}

// Chọn ô
function selectSquare(r, c) {
    var p = board[r][c];
    if (!p) {
        selected = null;
        validMoves = [];
        redraw = true;
        return;
    }
    
    var isW = p === p.toUpperCase();
    if ((player === 'white' && !isW) || (player === 'black' && isW)) {
        selected = null;
        validMoves = [];
        redraw = true;
        return;
    }
    
    selected = {row: r, col: c};
    validMoves = getMoves(r, c);
    redraw = true;
}

// Lấy nước đi hợp lệ
function getMoves(r, c) {
    var p = board[r][c];
    if (!p) return [];
    
    var isW = p === p.toUpperCase();
    var type = p.toLowerCase();
    
    if (type === 'p') return pawnMoves(r, c, isW);
    if (type === 'r') return rookMoves(r, c, isW);
    if (type === 'n') return knightMoves(r, c, isW);
    if (type === 'b') return bishopMoves(r, c, isW);
    if (type === 'q') return queenMoves(r, c, isW);
    if (type === 'k') return kingMoves(r, c, isW);
    
    return [];
}

// Tốt
function pawnMoves(r, c, isW) {
    var m = [];
    var d = isW ? -1 : 1;
    var start = isW ? 6 : 1;
    
    if (board[r + d] && board[r + d][c] === '') {
        m.push({row: r + d, col: c});
        if (r === start && board[r + 2 * d][c] === '') {
            m.push({row: r + 2 * d, col: c});
        }
    }
    
    var dc, nc, t;
    for (var i = 0; i < 2; i++) {
        dc = i === 0 ? -1 : 1;
        nc = c + dc;
        if (nc >= 0 && nc < 8 && board[r + d] && board[r + d][nc]) {
            t = board[r + d][nc];
            if ((t === t.toUpperCase()) !== isW) {
                m.push({row: r + d, col: nc});
            }
        }
    }
    return m;
}

// Xe
function rookMoves(r, c, isW) {
    var m = [];
    var dirs = [[0,1],[0,-1],[1,0],[-1,0]];
    var d, dr, dc, nr, nc, t;
    
    for (d = 0; d < dirs.length; d++) {
        dr = dirs[d][0];
        dc = dirs[d][1];
        for (var i = 1; i < 8; i++) {
            nr = r + dr * i;
            nc = c + dc * i;
            if (nr < 0 || nr >= 8 || nc < 0 || nc >= 8) break;
            
            t = board[nr][nc];
            if (!t) {
                m.push({row: nr, col: nc});
            } else {
                if ((t === t.toUpperCase()) !== isW) {
                    m.push({row: nr, col: nc});
                }
                break;
            }
        }
    }
    return m;
}

// Mã
function knightMoves(r, c, isW) {
    var m = [];
    var kmoves = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
    var nr, nc, t;
    
    for (var i = 0; i < kmoves.length; i++) {
        nr = r + kmoves[i][0];
        nc = c + kmoves[i][1];
        if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
            t = board[nr][nc];
            if (!t || (t === t.toUpperCase()) !== isW) {
                m.push({row: nr, col: nc});
            }
        }
    }
    return m;
}

// Tượng
function bishopMoves(r, c, isW) {
    var m = [];
    var dirs = [[1,1],[1,-1],[-1,1],[-1,-1]];
    var d, dr, dc, nr, nc, t;
    
    for (d = 0; d < dirs.length; d++) {
        dr = dirs[d][0];
        dc = dirs[d][1];
        for (var i = 1; i < 8; i++) {
            nr = r + dr * i;
            nc = c + dc * i;
            if (nr < 0 || nr >= 8 || nc < 0 || nc >= 8) break;
            
            t = board[nr][nc];
            if (!t) {
                m.push({row: nr, col: nc});
            } else {
                if ((t === t.toUpperCase()) !== isW) {
                    m.push({row: nr, col: nc});
                }
                break;
            }
        }
    }
    return m;
}

// Hậu
function queenMoves(r, c, isW) {
    var rm = rookMoves(r, c, isW);
    var bm = bishopMoves(r, c, isW);
    return rm.concat(bm);
}

// Vua
function kingMoves(r, c, isW) {
    var m = [];
    var dirs = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
    var nr, nc, t;
    
    for (var i = 0; i < dirs.length; i++) {
        nr = r + dirs[i][0];
        nc = c + dirs[i][1];
        if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
            t = board[nr][nc];
            if (!t || (t === t.toUpperCase()) !== isW) {
                m.push({row: nr, col: nc});
            }
        }
    }
    return m;
}

// Di chuyển quân cờ
function movePiece(fr, fc, tr, tc) {
    board[tr][tc] = board[fr][fc];
    board[fr][fc] = '';
    player = player === 'white' ? 'black' : 'white';
    moves = moves + 1;
    redraw = true;
    checkGameOver();
}

// Kiểm tra kết thúc
function checkGameOver() {
    var wk = false, bk = false;
    for (var r = 0; r < 8; r++) {
        for (var c = 0; c < 8; c++) {
            if (board[r][c] === 'K') wk = true;
            if (board[r][c] === 'k') bk = true;
        }
    }
    
    if (!wk) {
        gameOver = true;
        display.drawFillRect(0, 0, screenWidth, screenHeight, display.color(255, 0, 0));
        display.setTextColor(display.color(255, 255, 255));
        display.setTextSize(2);
        display.drawString('Bot Wins!', screenWidth / 2 - 50, screenHeight / 2 - 10);
        delay(3000);
    } else if (!bk) {
        gameOver = true;
        display.drawFillRect(0, 0, screenWidth, screenHeight, display.color(0, 255, 0));
        display.setTextColor(display.color(0, 0, 0));
        display.setTextSize(2);
        display.drawString('You Win!', screenWidth / 2 - 50, screenHeight / 2 - 10);
        delay(3000);
    }
}

// Bot AI
function botMove() {
    var best = findBestMove(difficulty);
    if (best) {
        movePiece(best.fr, best.fc, best.tr, best.tc);
    }
}

// Tìm nước đi tốt nhất
function findBestMove(depth) {
    var bestScore = Infinity;
    var best = null;
    
    for (var r = 0; r < 8; r++) {
        for (var c = 0; c < 8; c++) {
            var p = board[r][c];
            if (p && p === p.toLowerCase()) {
                var mvs = getMoves(r, c);
                for (var m = 0; m < mvs.length; m++) {
                    var mv = mvs[m];
                    var orig = board[mv.row][mv.col];
                    
                    board[mv.row][mv.col] = board[r][c];
                    board[r][c] = '';
                    
                    var score = minimax(depth - 1, false, -Infinity, Infinity);
                    
                    board[r][c] = board[mv.row][mv.col];
                    board[mv.row][mv.col] = orig;
                    
                    if (score < bestScore) {
                        bestScore = score;
                        best = {fr: r, fc: c, tr: mv.row, tc: mv.col};
                    }
                }
            }
        }
    }
    return best;
}

// Minimax với Alpha-Beta
function minimax(depth, isMax, alpha, beta) {
    if (depth === 0) return evaluateBoard();
    
    if (isMax) {
        var maxS = -Infinity;
        for (var r = 0; r < 8; r++) {
            for (var c = 0; c < 8; c++) {
                var p = board[r][c];
                if (p && p === p.toUpperCase()) {
                    var mvs = getMoves(r, c);
                    for (var m = 0; m < mvs.length; m++) {
                        var mv = mvs[m];
                        var orig = board[mv.row][mv.col];
                        
                        board[mv.row][mv.col] = board[r][c];
                        board[r][c] = '';
                        
                        var s = minimax(depth - 1, false, alpha, beta);
                        
                        board[r][c] = board[mv.row][mv.col];
                        board[mv.row][mv.col] = orig;
                        
                        maxS = Math.max(maxS, s);
                        alpha = Math.max(alpha, s);
                        if (beta <= alpha) return maxS;
                    }
                }
            }
        }
        return maxS;
    } else {
        var minS = Infinity;
        for (var r = 0; r < 8; r++) {
            for (var c = 0; c < 8; c++) {
                var p = board[r][c];
                if (p && p === p.toLowerCase()) {
                    var mvs = getMoves(r, c);
                    for (var m = 0; m < mvs.length; m++) {
                        var mv = mvs[m];
                        var orig = board[mv.row][mv.col];
                        
                        board[mv.row][mv.col] = board[r][c];
                        board[r][c] = '';
                        
                        var s = minimax(depth - 1, true, alpha, beta);
                        
                        board[r][c] = board[mv.row][mv.col];
                        board[mv.row][mv.col] = orig;
                        
                        minS = Math.min(minS, s);
                        beta = Math.min(beta, s);
                        if (beta <= alpha) return minS;
                    }
                }
            }
        }
        return minS;
    }
}

// Đánh giá bàn cờ
function evaluateBoard() {
    var score = 0;
    for (var r = 0; r < 8; r++) {
        for (var c = 0; c < 8; c++) {
            var p = board[r][c];
            if (p) score = score + VALUES[p];
        }
    }
    return score;
}

// Game loop chính
function gameLoop() {
    initBoard();
    
    while (!gameOver) {
        drawBoard();
        
        if (player === 'white') {
            // Xử lý input người chơi
            if (keyboard.getPrevPress()) {
                // Di chuyển trái, nếu hết thì lên dòng trên
                if (cursor.col > 0) {
                    cursor.col = cursor.col - 1;
                } else {
                    cursor.col = 7;
                    cursor.row = cursor.row > 0 ? cursor.row - 1 : 7;
                }
                redraw = true;
                delay(150);
            }
            
            if (keyboard.getNextPress()) {
                // Di chuyển phải, nếu hết thì xuống dòng dưới
                if (cursor.col < 7) {
                    cursor.col = cursor.col + 1;
                } else {
                    cursor.col = 0;
                    cursor.row = cursor.row < 7 ? cursor.row + 1 : 0;
                }
                redraw = true;
                delay(150);
            }
            
            if (keyboard.getSelPress()) {
                if (selected) {
                    if (isValidMove(cursor.row, cursor.col)) {
                        movePiece(selected.row, selected.col, cursor.row, cursor.col);
                        selected = null;
                        validMoves = [];
                        
                        if (!gameOver) {
                            delay(500);
                            botMove();
                        }
                    } else {
                        selectSquare(cursor.row, cursor.col);
                    }
                } else {
                    selectSquare(cursor.row, cursor.col);
                }
                delay(200);
            }
            
            if (keyboard.getEscPress()) {
                display.drawFillRect(0, 0, screenWidth, screenHeight, display.color(255, 0, 0));
                display.setTextColor(display.color(255, 255, 255));
                display.setTextSize(2);
                display.drawString('Exiting...', screenWidth / 2 - 60, screenHeight / 2 - 10);
                delay(2000);
                break;
            }
        } else {
            // Lượt bot
            botMove();
        }
        
        delay(100);
    }
}

// Chạy game
gameLoop();