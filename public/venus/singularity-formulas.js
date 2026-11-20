(() => {
  'use strict';

  const em = 64;
  const fontFamily = '"Cambria Math", "STIX Two Math", "Latin Modern Math", "Times New Roman", serif';

  // Each box is measured from its baseline, including accents, descenders and scripts.
  function typesetter(context) {
    function text(value, size = em, style = 'normal') {
      const font = `${style} ${size}px ${fontFamily}`;
      context.font = font;
      const metrics = context.measureText(value);
      const inset = Math.max(0, metrics.actualBoundingBoxLeft);
      const width = inset + Math.max(metrics.width, metrics.actualBoundingBoxRight);
      return {
        width, ascent: metrics.actualBoundingBoxAscent, descent: Math.max(0, metrics.actualBoundingBoxDescent),
        draw(x, y) {
          context.font = font;
          context.fillText(value, x + inset, y);
        }
      };
    }

    function line(...parts) {
      return {
        width: parts.reduce((total, part) => total + part.width, 0),
        ascent: Math.max(...parts.map((part) => part.ascent)),
        descent: Math.max(...parts.map((part) => part.descent)),
        draw(x, y) {
          for (const part of parts) {
            part.draw(x, y);
            x += part.width;
          }
        }
      };
    }

    const math = (value, size = em) => text(value, size, 'italic');
    const subText = (value) => math(value, em * .55);
    const gap = (width) => ({ width, ascent: 0, descent: 0, draw() {} });
    const space = gap(em * .1);
    const operator = (value) => line(gap(em * .13), text(value), gap(em * .13));

    function scripts(base, { up, down }) {
      const offset = base.width + em * .015;
      const raise = Math.max(em * .37, base.ascent * .68);
      const drop = Math.max(em * .21, base.descent + em * .13);
      return {
        width: offset + Math.max(up?.width ?? 0, down?.width ?? 0),
        ascent: Math.max(base.ascent, up ? up.ascent + raise : 0),
        descent: Math.max(base.descent, down ? down.descent + drop : 0),
        draw(x, y) {
          base.draw(x, y);
          up?.draw(x + offset, y - raise);
          down?.draw(x + offset, y + drop);
        }
      };
    }

    const power = (value, exponent) => scripts(math(value), { up: subText(exponent) });
    const index = (value, indices) => scripts(math(value), { down: subText(indices) });

    function fraction(numerator, denominator) {
      const width = Math.max(numerator.width, denominator.width) + em * .14;
      const axis = em * .245;
      const clearance = em * .075;
      return {
        width, ascent: axis + clearance + numerator.descent + numerator.ascent,
        descent: Math.max(0, clearance + denominator.ascent + denominator.descent - axis),
        draw(x, y) {
          const rule = y - axis;
          context.fillRect(x, rule - 1, width, 2);
          numerator.draw(x + (width - numerator.width) / 2, rule - clearance - numerator.descent);
          denominator.draw(x + (width - denominator.width) / 2, rule + clearance + denominator.ascent);
        }
      };
    }

    const small = (value) => math(value, em * .72);
    const ratio = (above, below) => fraction(small(above), small(below));

    function radical(value, size = em) {
      const lead = size * .46;
      const width = lead + value.width + size * .07;
      const ascent = value.ascent + size * .1;
      const descent = Math.max(value.descent, size * .025);
      return {
        width, ascent, descent,
        draw(x, y) {
          context.beginPath();
          context.lineWidth = size * .028;
          context.moveTo(x, y - size * .22);
          context.lineTo(x + lead * .3, y - size * .28);
          context.lineTo(x + lead * .58, y + descent);
          context.lineTo(x + lead, y - ascent);
          context.lineTo(x + width, y - ascent);
          context.stroke();
          value.draw(x + lead, y);
        }
      };
    }

    function limits(symbol, below, above) {
      const width = Math.max(symbol.width, below.width, above?.width ?? 0);
      const top = symbol.ascent + em * .08 + (above?.descent ?? 0);
      const bottom = symbol.descent + em * .08 + below.ascent;
      return {
        width, ascent: above ? top + above.ascent : symbol.ascent, descent: bottom + below.descent,
        draw(x, y) {
          symbol.draw(x + (width - symbol.width) / 2, y);
          below.draw(x + (width - below.width) / 2, y + bottom);
          if (above) above.draw(x + (width - above.width) / 2, y - top);
        }
      };
    }

    function integral(lower, upper) {
      return line(scripts(text('∫', em * 1.26), {
        up: subText(upper), down: subText(lower)
      }), space);
    }

    function sum(lower) {
      return line(limits(text('∑', em * 1.02), subText(lower), subText('∞')), space);
    }

    function matrix(values) {
      const rows = values.map((row) => row.map((value) => text(value, em * .55)));
      const columns = rows[0].map((_, column) => Math.max(...rows.map((row) => row[column].width)) + em * .22);
      const rowHeight = em * .55;
      const bracket = em * .26;
      const height = rows.length * rowHeight + em * .12;
      const ascent = height / 2 + em * .245;
      const width = columns.reduce((total, size) => total + size, bracket * 2);
      return {
        width, ascent, descent: height - ascent,
        draw(x, y) {
          const top = y - ascent;
          rows.forEach((row, i) => {
            let start = x + bracket;
            row.forEach((cell, j) => {
              cell.draw(start + (columns[j] - cell.width) / 2, top + (i + .7) * rowHeight + cell.ascent / 2);
              start += columns[j];
            });
          });
          context.lineWidth = em * .029;
          context.beginPath();
          for (const direction of [1, -1]) {
            const side = direction === 1 ? x : x + width;
            const start = side + direction * bracket;
            context.moveTo(start, top);
            context.bezierCurveTo(side, top + height * .2, side, top + height * .8, start, top + height);
          }
          context.stroke();
        }
      };
    }

    const eq = operator('=');
    const plus = operator('+');
    const minus = operator('−');
    const vector = (value) => text(value, em, 'bold');

    return [
      ['euler', line(power('e', 'iπ'), plus, text('1'), eq, text('0'))],
      ['einstein', line(index('G', 'μν'), eq, text('8'), math('πG'), space, index('T', 'μν'))],
      ['integral', line(integral('a', 'b'), math('f(x)'), space, text('d'), math('x'))],
      ['faraday', line(text('∇'), operator('×'), vector('E'), eq, text('−'),
        fraction(text('∂B', em * .72, 'bold'), small('∂t')))],
      ['metric', line(index('g', 'μν'), eq, matrix([
        ['−1', '0', '0', '0'], ['0', '1', '0', '0'], ['0', '0', '1', '0'], ['0', '0', '0', '1']
      ]))],
      ['limit', line(limits(text('lim'), subText('x → 0')), space,
        fraction(line(text('sin', em * .72), space, small('x')), small('x')), eq, text('1'))],
      ['gaussian', line(integral('−∞', '∞'), power('e', '−x²'), space, text('d'), math('x'), eq, radical(math('π')))],
      ['euler-expanded', line(power('e', 'iθ'), eq, text('cos'), space, math('θ'), plus,
        math('i'), text('sin'), space, math('θ'))],
      ['circle', line(power('x', '2'), plus, power('y', '2'), eq, power('r', '2'))],
      ['wave', line(ratio('∂²u', '∂t²'), eq, power('c', '2'), power('∇', '2'), math('u'))],
      ['heat', line(ratio('∂u', '∂t'), eq, math('D'), power('∇', '2'), math('u'))],
      ['laplace', line(power('∇', '2'), math('φ'), eq, text('4'), math('πGρ'))],
      ['electric', line(text('∇'), operator('·'), vector('E'), eq, ratio('ρ', 'ε₀'))],
      ['magnetic', line(text('∇'), operator('·'), vector('B'), eq, text('0'))],
      ['basel', line(sum('n = 1'), ratio('1', 'n²'), eq, ratio('π²', '6'))],
      ['series', line(math('f(z)'), eq, sum('n = 0'), index('a', 'n'), power('z', 'n'))],
      ['pythagoras', line(power('a', '2'), plus, power('b', '2'), eq, power('c', '2'))],
      ['identity', line(scripts(text('sin'), { up: subText('2') }), space, math('θ'), plus,
        scripts(text('cos'), { up: subText('2') }), space, math('θ'), eq, text('1'))],
      ['double-angle', line(text('cos'), math('(2θ)'), eq, text('1'), minus, text('2'),
        scripts(text('sin'), { up: subText('2') }), space, math('θ'))],
      ['golden', line(math('φ'), eq, fraction(line(text('1 + ', em * .72), radical(text('5', em * .72), em * .72)),
        text('2', em * .72)))],
      ['slope', line(math('y'), eq, math('ax'), plus, math('b'))],
      ['quadratic', line(math('y'), eq, math('a'), power('x', '2'), plus, math('bx'), plus, math('c'))],
      ['sine', line(math('y'), eq, math('A'), space, text('sin'), math('(Bx + C)'))],
      ['mass', line(math('E'), eq, math('m'), power('c', '2'))],
      ['eigenvalue', line(math('Ax'), eq, math('λx'))],
      ['determinant', line(text('det'), math('(A − λI)'), eq, text('0'))],
      ['gamma', line(text('Γ'), math('(n + 1)'), eq, math('n'), text('!'))],
      ['imaginary', line(power('i', '2'), eq, text('−1'))],
      ['fundamental', line(integral('a', 'b'), math('f′(x)'), space, text('d'), math('x'), eq,
        math('f(b)'), minus, math('f(a)'))],
      ['sphere', line(math('S'), eq, text('4'), math('π'), power('r', '2'))],
      ['fibonacci', line(index('F', 'n+2'), eq, index('F', 'n+1'), plus, index('F', 'n'))],
      ['derivative', line(ratio('d', 'dx'), math('f(x)'), eq, limits(text('lim'), subText('h → 0')), space,
        ratio('f(x + h) − f(x)', 'h'))]
    ];
  }

  window.createVenusFormulaAtlas = function createVenusFormulaAtlas() {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 2048;
    const padding = 5;
    const gap = 6;
    const formulas = typesetter(context);
    const entries = new Array(formulas.length);
    const heroes = { euler: 0, einstein: 1, integral: 2, faraday: 3 };
    const ordered = formulas.map(([key, box], index) => ({ key, box, index }))
      .sort((a, b) => b.box.ascent + b.box.descent - a.box.ascent - a.box.descent);
    let x = gap, y = gap, shelfHeight = 0;

    for (const { key, box, index } of ordered) {
      const width = Math.ceil(box.width) + padding * 2;
      const height = Math.ceil(box.ascent + box.descent) + padding * 2;
      if (x + width + gap > canvas.width) {
        x = gap;
        y += shelfHeight + gap;
        shelfHeight = 0;
      }
      entries[index] = { x, y, width, height, key };
      shelfHeight = Math.max(shelfHeight, height);
      x += width + gap;
    }

    // Power-of-two dimensions allow mipmaps in both WebGL versions.
    canvas.height = 2 ** Math.ceil(Math.log2(y + shelfHeight + gap));
    context.fillStyle = context.strokeStyle = '#fff';
    context.textBaseline = 'alphabetic';
    formulas.forEach(([, box], index) => {
      const entry = entries[index];
      box.draw(entry.x + padding, entry.y + padding + box.ascent);
    });
    return { canvas, entries, em, heroes };
  };
})();
