var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function custom_event(type, detail, bubbles = false) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            while (flushidx < dirty_components.length) {
                const component = dirty_components[flushidx];
                flushidx++;
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.47.0' }, detail), true));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function prop_dev(node, property, value) {
        node[property] = value;
        dispatch_dev('SvelteDOMSetProperty', { node, property, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src\App.svelte generated by Svelte v3.47.0 */

    const { Object: Object_1, console: console_1 } = globals;
    const file = "src\\App.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[13] = list[i];
    	child_ctx[14] = list;
    	child_ctx[15] = i;
    	return child_ctx;
    }

    // (82:2) {:else}
    function create_else_block_1(ctx) {
    	let p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "No fonts found in \"Fonts\" directory";
    			add_location(p, file, 82, 3, 1856);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_1.name,
    		type: "else",
    		source: "(82:2) {:else}",
    		ctx
    	});

    	return block;
    }

    // (66:2) {#if Object.keys(fonts).length > 0}
    function create_if_block_1(ctx) {
    	let each_1_anchor;
    	let each_value = Object.keys(/*fonts*/ ctx[0]);
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*removeFont, Object, fonts, config, useFont*/ 51) {
    				each_value = Object.keys(/*fonts*/ ctx[0]);
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		d: function destroy(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(66:2) {#if Object.keys(fonts).length > 0}",
    		ctx
    	});

    	return block;
    }

    // (76:5) {:else}
    function create_else_block(ctx) {
    	let p;
    	let input;
    	let input_value_value;
    	let mounted;
    	let dispose;

    	function click_handler_1() {
    		return /*click_handler_1*/ ctx[11](/*fontFile*/ ctx[13]);
    	}

    	const block = {
    		c: function create() {
    			p = element("p");
    			input = element("input");
    			attr_dev(input, "type", "button");
    			input.value = input_value_value = "➕ " + /*fontFile*/ ctx[13];
    			attr_dev(input, "class", "svelte-ii7s09");
    			add_location(input, file, 76, 9, 1710);
    			add_location(p, file, 76, 6, 1707);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, input);

    			if (!mounted) {
    				dispose = listen_dev(input, "click", click_handler_1, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty & /*fonts*/ 1 && input_value_value !== (input_value_value = "➕ " + /*fontFile*/ ctx[13])) {
    				prop_dev(input, "value", input_value_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(76:5) {:else}",
    		ctx
    	});

    	return block;
    }

    // (69:5) {#if fontFile in config}
    function create_if_block_2(ctx) {
    	let h3;
    	let t0_value = /*fontFile*/ ctx[13] + "";
    	let t0;
    	let t1;
    	let p0;
    	let t3;
    	let p1;
    	let input0;
    	let t4;
    	let p2;
    	let t6;
    	let p3;
    	let textarea;
    	let t7;
    	let p4;
    	let input1;
    	let mounted;
    	let dispose;

    	function input0_input_handler() {
    		/*input0_input_handler*/ ctx[8].call(input0, /*fontFile*/ ctx[13]);
    	}

    	function textarea_input_handler() {
    		/*textarea_input_handler*/ ctx[9].call(textarea, /*fontFile*/ ctx[13]);
    	}

    	function click_handler() {
    		return /*click_handler*/ ctx[10](/*fontFile*/ ctx[13]);
    	}

    	const block = {
    		c: function create() {
    			h3 = element("h3");
    			t0 = text(t0_value);
    			t1 = space();
    			p0 = element("p");
    			p0.textContent = "CSS font-family:";
    			t3 = space();
    			p1 = element("p");
    			input0 = element("input");
    			t4 = space();
    			p2 = element("p");
    			p2.textContent = "Subsetting text:";
    			t6 = space();
    			p3 = element("p");
    			textarea = element("textarea");
    			t7 = space();
    			p4 = element("p");
    			input1 = element("input");
    			add_location(h3, file, 69, 6, 1337);
    			add_location(p0, file, 70, 6, 1364);
    			attr_dev(input0, "type", "text");
    			attr_dev(input0, "size", "45");
    			attr_dev(input0, "class", "svelte-ii7s09");
    			add_location(input0, file, 71, 9, 1398);
    			add_location(p1, file, 71, 6, 1395);
    			add_location(p2, file, 72, 6, 1478);
    			attr_dev(textarea, "rows", "3");
    			attr_dev(textarea, "cols", "45");
    			attr_dev(textarea, "class", "svelte-ii7s09");
    			add_location(textarea, file, 73, 9, 1512);
    			add_location(p3, file, 73, 6, 1509);
    			attr_dev(input1, "type", "button");
    			input1.value = "❌ Remove";
    			attr_dev(input1, "class", "svelte-ii7s09");
    			add_location(input1, file, 74, 9, 1602);
    			add_location(p4, file, 74, 6, 1599);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h3, anchor);
    			append_dev(h3, t0);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, p0, anchor);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, p1, anchor);
    			append_dev(p1, input0);
    			set_input_value(input0, /*config*/ ctx[1][/*fontFile*/ ctx[13]].fontname);
    			insert_dev(target, t4, anchor);
    			insert_dev(target, p2, anchor);
    			insert_dev(target, t6, anchor);
    			insert_dev(target, p3, anchor);
    			append_dev(p3, textarea);
    			set_input_value(textarea, /*config*/ ctx[1][/*fontFile*/ ctx[13]].text);
    			insert_dev(target, t7, anchor);
    			insert_dev(target, p4, anchor);
    			append_dev(p4, input1);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "input", input0_input_handler),
    					listen_dev(textarea, "input", textarea_input_handler),
    					listen_dev(input1, "click", click_handler, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty & /*fonts*/ 1 && t0_value !== (t0_value = /*fontFile*/ ctx[13] + "")) set_data_dev(t0, t0_value);

    			if (dirty & /*config, Object, fonts*/ 3 && input0.value !== /*config*/ ctx[1][/*fontFile*/ ctx[13]].fontname) {
    				set_input_value(input0, /*config*/ ctx[1][/*fontFile*/ ctx[13]].fontname);
    			}

    			if (dirty & /*config, Object, fonts*/ 3) {
    				set_input_value(textarea, /*config*/ ctx[1][/*fontFile*/ ctx[13]].text);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h3);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(p0);
    			if (detaching) detach_dev(t3);
    			if (detaching) detach_dev(p1);
    			if (detaching) detach_dev(t4);
    			if (detaching) detach_dev(p2);
    			if (detaching) detach_dev(t6);
    			if (detaching) detach_dev(p3);
    			if (detaching) detach_dev(t7);
    			if (detaching) detach_dev(p4);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(69:5) {#if fontFile in config}",
    		ctx
    	});

    	return block;
    }

    // (67:3) {#each Object.keys(fonts) as fontFile}
    function create_each_block(ctx) {
    	let div;
    	let t;
    	let hr;

    	function select_block_type_1(ctx, dirty) {
    		if (/*fontFile*/ ctx[13] in /*config*/ ctx[1]) return create_if_block_2;
    		return create_else_block;
    	}

    	let current_block_type = select_block_type_1(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			if_block.c();
    			t = space();
    			hr = element("hr");
    			attr_dev(div, "class", "font");
    			add_location(div, file, 67, 4, 1280);
    			add_location(hr, file, 79, 4, 1824);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			if_block.m(div, null);
    			insert_dev(target, t, anchor);
    			insert_dev(target, hr, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (current_block_type === (current_block_type = select_block_type_1(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(div, null);
    				}
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if_block.d();
    			if (detaching) detach_dev(t);
    			if (detaching) detach_dev(hr);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(67:3) {#each Object.keys(fonts) as fontFile}",
    		ctx
    	});

    	return block;
    }

    // (92:1) {#if output.length > 0}
    function create_if_block(ctx) {
    	let div;
    	let p;
    	let textarea;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			p = element("p");
    			textarea = element("textarea");
    			attr_dev(textarea, "class", "output svelte-ii7s09");
    			attr_dev(textarea, "rows", "3");
    			attr_dev(textarea, "cols", "45");
    			add_location(textarea, file, 93, 6, 2184);
    			add_location(p, file, 93, 3, 2181);
    			attr_dev(div, "id", "output");
    			add_location(div, file, 92, 2, 2159);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, p);
    			append_dev(p, textarea);
    			set_input_value(textarea, /*output*/ ctx[2]);

    			if (!mounted) {
    				dispose = listen_dev(textarea, "input", /*textarea_input_handler_1*/ ctx[12]);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*output*/ 4) {
    				set_input_value(textarea, /*output*/ ctx[2]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(92:1) {#if output.length > 0}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let main;
    	let h1;
    	let t1;
    	let div0;
    	let show_if;
    	let t2;
    	let div1;
    	let p;
    	let input0;
    	let t3;
    	let input1;
    	let t4;
    	let mounted;
    	let dispose;

    	function select_block_type(ctx, dirty) {
    		if (dirty & /*fonts*/ 1) show_if = null;
    		if (show_if == null) show_if = !!(Object.keys(/*fonts*/ ctx[0]).length > 0);
    		if (show_if) return create_if_block_1;
    		return create_else_block_1;
    	}

    	let current_block_type = select_block_type(ctx, -1);
    	let if_block0 = current_block_type(ctx);
    	let if_block1 = /*output*/ ctx[2].length > 0 && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			main = element("main");
    			h1 = element("h1");
    			h1.textContent = "Web Font Generator";
    			t1 = space();
    			div0 = element("div");
    			if_block0.c();
    			t2 = space();
    			div1 = element("div");
    			p = element("p");
    			input0 = element("input");
    			t3 = space();
    			input1 = element("input");
    			t4 = space();
    			if (if_block1) if_block1.c();
    			add_location(h1, file, 63, 1, 1146);
    			attr_dev(div0, "id", "fonts");
    			add_location(div0, file, 64, 1, 1176);
    			input0.disabled = /*disabled*/ ctx[3];
    			attr_dev(input0, "type", "button");
    			input0.value = "⚙️ Generate fonts.css";
    			attr_dev(input0, "class", "svelte-ii7s09");
    			add_location(input0, file, 87, 3, 1949);
    			input1.disabled = /*disabled*/ ctx[3];
    			attr_dev(input1, "type", "button");
    			input1.value = "❌ Remove all";
    			attr_dev(input1, "class", "svelte-ii7s09");
    			add_location(input1, file, 88, 3, 2039);
    			add_location(p, file, 86, 2, 1941);
    			attr_dev(div1, "id", "buttons");
    			add_location(div1, file, 85, 1, 1919);
    			attr_dev(main, "class", "svelte-ii7s09");
    			add_location(main, file, 62, 0, 1137);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, h1);
    			append_dev(main, t1);
    			append_dev(main, div0);
    			if_block0.m(div0, null);
    			append_dev(main, t2);
    			append_dev(main, div1);
    			append_dev(div1, p);
    			append_dev(p, input0);
    			append_dev(p, t3);
    			append_dev(p, input1);
    			append_dev(main, t4);
    			if (if_block1) if_block1.m(main, null);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "click", /*generate*/ ctx[6], false, false, false),
    					listen_dev(input1, "click", /*clear*/ ctx[7], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (current_block_type === (current_block_type = select_block_type(ctx, dirty)) && if_block0) {
    				if_block0.p(ctx, dirty);
    			} else {
    				if_block0.d(1);
    				if_block0 = current_block_type(ctx);

    				if (if_block0) {
    					if_block0.c();
    					if_block0.m(div0, null);
    				}
    			}

    			if (dirty & /*disabled*/ 8) {
    				prop_dev(input0, "disabled", /*disabled*/ ctx[3]);
    			}

    			if (dirty & /*disabled*/ 8) {
    				prop_dev(input1, "disabled", /*disabled*/ ctx[3]);
    			}

    			if (/*output*/ ctx[2].length > 0) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block(ctx);
    					if_block1.c();
    					if_block1.m(main, null);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			if_block0.d();
    			if (if_block1) if_block1.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    async function apiRequest(data) {
    	const res = await fetch("/api", {
    		method: "POST",
    		body: JSON.stringify(data)
    	});

    	return await res.json();
    }

    function instance($$self, $$props, $$invalidate) {
    	let disabled;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	let fonts = {};
    	let config = {};
    	let output = "";

    	async function useFont(fontFile) {
    		$$invalidate(
    			1,
    			config[fontFile] = {
    				text: "",
    				engine: "fec",
    				fontname: fonts[fontFile].name || ""
    			},
    			config
    		);

    		$$invalidate(1, config);
    	}

    	async function removeFont(fontFile) {
    		if (fontFile in config) delete config[fontFile];
    		$$invalidate(1, config);
    	}

    	async function generate() {
    		const res = await apiRequest({ method: "generateFonts", config });

    		if (res.ok && res.output) {
    			$$invalidate(2, output = res.output);
    		}
    	}

    	async function clear() {
    		$$invalidate(1, config = {});
    		$$invalidate(2, output = "");
    	}

    	onMount(async () => {
    		let res = await apiRequest({ method: "fontsList" });
    		$$invalidate(0, fonts = res.data.fonts);
    		console.log(fonts);
    		res = await apiRequest({ method: "fontsConfig" });
    		$$invalidate(1, config = res.data.config);
    		console.log(config);
    	});

    	const writable_props = [];

    	Object_1.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	function input0_input_handler(fontFile) {
    		config[fontFile].fontname = this.value;
    		$$invalidate(1, config);
    	}

    	function textarea_input_handler(fontFile) {
    		config[fontFile].text = this.value;
    		$$invalidate(1, config);
    	}

    	const click_handler = fontFile => removeFont(fontFile);
    	const click_handler_1 = fontFile => useFont(fontFile);

    	function textarea_input_handler_1() {
    		output = this.value;
    		$$invalidate(2, output);
    	}

    	$$self.$capture_state = () => ({
    		onMount,
    		fonts,
    		config,
    		output,
    		apiRequest,
    		useFont,
    		removeFont,
    		generate,
    		clear,
    		disabled
    	});

    	$$self.$inject_state = $$props => {
    		if ('fonts' in $$props) $$invalidate(0, fonts = $$props.fonts);
    		if ('config' in $$props) $$invalidate(1, config = $$props.config);
    		if ('output' in $$props) $$invalidate(2, output = $$props.output);
    		if ('disabled' in $$props) $$invalidate(3, disabled = $$props.disabled);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*fonts*/ 1) {
    			$$invalidate(3, disabled = Object.keys(fonts).length === 0);
    		}
    	};

    	return [
    		fonts,
    		config,
    		output,
    		disabled,
    		useFont,
    		removeFont,
    		generate,
    		clear,
    		input0_input_handler,
    		textarea_input_handler,
    		click_handler,
    		click_handler_1,
    		textarea_input_handler_1
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
    	target: document.body
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
