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
    let src_url_equal_anchor;
    function src_url_equal(element_src, url) {
        if (!src_url_equal_anchor) {
            src_url_equal_anchor = document.createElement('a');
        }
        src_url_equal_anchor.href = url;
        return element_src === src_url_equal_anchor.href;
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
    function to_number(value) {
        return value === '' ? null : +value;
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function set_style(node, key, value, important) {
        if (value === null) {
            node.style.removeProperty(key);
        }
        else {
            node.style.setProperty(key, value, important ? 'important' : '');
        }
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
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

    const { console: console_1 } = globals;
    const file = "src\\App.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[13] = list[i];
    	child_ctx[14] = list;
    	child_ctx[15] = i;
    	return child_ctx;
    }

    // (110:2) {:else}
    function create_else_block(ctx) {
    	let p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "No images found in \"Images\" directory";
    			add_location(p, file, 110, 3, 2903);
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
    		id: create_else_block.name,
    		type: "else",
    		source: "(110:2) {:else}",
    		ctx
    	});

    	return block;
    }

    // (76:2) {#if images.length > 0}
    function create_if_block(ctx) {
    	let each_1_anchor;
    	let each_value = /*images*/ ctx[0];
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
    			if (dirty & /*ext, images, config*/ 3) {
    				each_value = /*images*/ ctx[0];
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
    		id: create_if_block.name,
    		type: "if",
    		source: "(76:2) {#if images.length > 0}",
    		ctx
    	});

    	return block;
    }

    // (78:4) {#if imageFile in config}
    function create_if_block_1(ctx) {
    	let div6;
    	let fieldset;
    	let legend;
    	let b;
    	let t0_value = /*imageFile*/ ctx[13] + "";
    	let t0;
    	let t1;
    	let div5;
    	let div0;
    	let a;
    	let img;
    	let img_src_value;
    	let img_alt_value;
    	let a_href_value;
    	let t2;
    	let div1;
    	let p;
    	let t4;
    	let input0;
    	let t5;
    	let div2;
    	let input1;
    	let t6;
    	let div3;
    	let label0;
    	let input2;
    	let t7;
    	let t8;
    	let div4;
    	let label1;
    	let input3;
    	let t9;
    	let t10;
    	let mounted;
    	let dispose;

    	function input0_change_input_handler() {
    		/*input0_change_input_handler*/ ctx[4].call(input0, /*imageFile*/ ctx[13]);
    	}

    	function input1_input_handler() {
    		/*input1_input_handler*/ ctx[5].call(input1, /*imageFile*/ ctx[13]);
    	}

    	function input2_change_handler() {
    		/*input2_change_handler*/ ctx[6].call(input2, /*imageFile*/ ctx[13]);
    	}

    	function func() {
    		return /*func*/ ctx[7](/*imageFile*/ ctx[13]);
    	}

    	function input3_change_handler() {
    		/*input3_change_handler*/ ctx[8].call(input3, /*imageFile*/ ctx[13]);
    	}

    	function func_1() {
    		return /*func_1*/ ctx[9](/*imageFile*/ ctx[13]);
    	}

    	const block = {
    		c: function create() {
    			div6 = element("div");
    			fieldset = element("fieldset");
    			legend = element("legend");
    			b = element("b");
    			t0 = text(t0_value);
    			t1 = space();
    			div5 = element("div");
    			div0 = element("div");
    			a = element("a");
    			img = element("img");
    			t2 = space();
    			div1 = element("div");
    			p = element("p");
    			p.textContent = "Quality";
    			t4 = space();
    			input0 = element("input");
    			t5 = space();
    			div2 = element("div");
    			input1 = element("input");
    			t6 = space();
    			div3 = element("div");
    			label0 = element("label");
    			input2 = element("input");
    			t7 = text("Progressive");
    			t8 = space();
    			div4 = element("div");
    			label1 = element("label");
    			input3 = element("input");
    			t9 = text("Grayscale");
    			t10 = space();
    			add_location(b, file, 80, 15, 1660);
    			add_location(legend, file, 80, 7, 1652);
    			attr_dev(img, "class", "thumb_image svelte-1gglsns");
    			if (!src_url_equal(img.src, img_src_value = "/file?path=Images/" + /*imageFile*/ ctx[13])) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", img_alt_value = /*imageFile*/ ctx[13]);
    			add_location(img, file, 84, 10, 1821);
    			attr_dev(a, "href", a_href_value = "/file?path=Images/" + /*imageFile*/ ctx[13]);
    			attr_dev(a, "target", "_blank");
    			add_location(a, file, 83, 9, 1753);
    			attr_dev(div0, "class", "thumb svelte-1gglsns");
    			add_location(div0, file, 82, 8, 1723);
    			add_location(p, file, 88, 9, 1972);
    			attr_dev(input0, "type", "range");
    			attr_dev(input0, "min", "0");
    			attr_dev(input0, "max", "100");
    			attr_dev(input0, "step", "1");
    			attr_dev(input0, "class", "svelte-1gglsns");
    			add_location(input0, file, 89, 9, 1997);
    			attr_dev(div1, "class", "widget");
    			add_location(div1, file, 87, 8, 1941);
    			attr_dev(input1, "type", "number");
    			attr_dev(input1, "min", "0");
    			attr_dev(input1, "max", "100");
    			attr_dev(input1, "step", "1");
    			add_location(input1, file, 92, 9, 2166);
    			attr_dev(div2, "class", "widget");
    			set_style(div2, "padding-top", "14px");
    			add_location(div2, file, 91, 8, 2109);
    			attr_dev(input2, "type", "checkbox");
    			attr_dev(input2, "name", "happy");
    			attr_dev(input2, "class", "svelte-1gglsns");
    			add_location(input2, file, 96, 10, 2403);
    			add_location(label0, file, 95, 9, 2384);
    			attr_dev(div3, "class", "widget svelte-1gglsns");
    			set_style(div3, "padding-top", "14px");
    			toggle_class(div3, "jpegOnly", func);
    			add_location(div3, file, 94, 8, 2279);
    			attr_dev(input3, "type", "checkbox");
    			attr_dev(input3, "name", "happy");
    			attr_dev(input3, "class", "svelte-1gglsns");
    			add_location(input3, file, 101, 10, 2679);
    			add_location(label1, file, 100, 9, 2660);
    			attr_dev(div4, "class", "widget svelte-1gglsns");
    			set_style(div4, "padding-top", "14px");
    			toggle_class(div4, "jpegOnly", func_1);
    			add_location(div4, file, 99, 8, 2555);
    			attr_dev(div5, "class", "row svelte-1gglsns");
    			add_location(div5, file, 81, 7, 1696);
    			add_location(fieldset, file, 79, 6, 1633);
    			attr_dev(div6, "class", "image svelte-1gglsns");
    			add_location(div6, file, 78, 5, 1606);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div6, anchor);
    			append_dev(div6, fieldset);
    			append_dev(fieldset, legend);
    			append_dev(legend, b);
    			append_dev(b, t0);
    			append_dev(fieldset, t1);
    			append_dev(fieldset, div5);
    			append_dev(div5, div0);
    			append_dev(div0, a);
    			append_dev(a, img);
    			append_dev(div5, t2);
    			append_dev(div5, div1);
    			append_dev(div1, p);
    			append_dev(div1, t4);
    			append_dev(div1, input0);
    			set_input_value(input0, /*config*/ ctx[1][/*imageFile*/ ctx[13]].quality);
    			append_dev(div5, t5);
    			append_dev(div5, div2);
    			append_dev(div2, input1);
    			set_input_value(input1, /*config*/ ctx[1][/*imageFile*/ ctx[13]].quality);
    			append_dev(div5, t6);
    			append_dev(div5, div3);
    			append_dev(div3, label0);
    			append_dev(label0, input2);
    			set_input_value(input2, /*config*/ ctx[1][/*imageFile*/ ctx[13]].options.compress.progressive);
    			append_dev(label0, t7);
    			append_dev(div5, t8);
    			append_dev(div5, div4);
    			append_dev(div4, label1);
    			append_dev(label1, input3);
    			set_input_value(input3, /*config*/ ctx[1][/*imageFile*/ ctx[13]].options.compress.grayscale);
    			append_dev(label1, t9);
    			append_dev(div6, t10);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "change", input0_change_input_handler),
    					listen_dev(input0, "input", input0_change_input_handler),
    					listen_dev(input1, "input", input1_input_handler),
    					listen_dev(input2, "change", input2_change_handler),
    					listen_dev(input3, "change", input3_change_handler)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty & /*images*/ 1 && t0_value !== (t0_value = /*imageFile*/ ctx[13] + "")) set_data_dev(t0, t0_value);

    			if (dirty & /*images*/ 1 && !src_url_equal(img.src, img_src_value = "/file?path=Images/" + /*imageFile*/ ctx[13])) {
    				attr_dev(img, "src", img_src_value);
    			}

    			if (dirty & /*images*/ 1 && img_alt_value !== (img_alt_value = /*imageFile*/ ctx[13])) {
    				attr_dev(img, "alt", img_alt_value);
    			}

    			if (dirty & /*images*/ 1 && a_href_value !== (a_href_value = "/file?path=Images/" + /*imageFile*/ ctx[13])) {
    				attr_dev(a, "href", a_href_value);
    			}

    			if (dirty & /*config, images*/ 3) {
    				set_input_value(input0, /*config*/ ctx[1][/*imageFile*/ ctx[13]].quality);
    			}

    			if (dirty & /*config, images*/ 3 && to_number(input1.value) !== /*config*/ ctx[1][/*imageFile*/ ctx[13]].quality) {
    				set_input_value(input1, /*config*/ ctx[1][/*imageFile*/ ctx[13]].quality);
    			}

    			if (dirty & /*config, images*/ 3) {
    				set_input_value(input2, /*config*/ ctx[1][/*imageFile*/ ctx[13]].options.compress.progressive);
    			}

    			if (dirty & /*ext, images*/ 1) {
    				toggle_class(div3, "jpegOnly", func);
    			}

    			if (dirty & /*config, images*/ 3) {
    				set_input_value(input3, /*config*/ ctx[1][/*imageFile*/ ctx[13]].options.compress.grayscale);
    			}

    			if (dirty & /*ext, images*/ 1) {
    				toggle_class(div4, "jpegOnly", func_1);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div6);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(78:4) {#if imageFile in config}",
    		ctx
    	});

    	return block;
    }

    // (77:3) {#each images as imageFile}
    function create_each_block(ctx) {
    	let if_block_anchor;
    	let if_block = /*imageFile*/ ctx[13] in /*config*/ ctx[1] && create_if_block_1(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (/*imageFile*/ ctx[13] in /*config*/ ctx[1]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_1(ctx);
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(77:3) {#each images as imageFile}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let main;
    	let h1;
    	let t1;
    	let div0;
    	let t2;
    	let div1;
    	let input;
    	let mounted;
    	let dispose;

    	function select_block_type(ctx, dirty) {
    		if (/*images*/ ctx[0].length > 0) return create_if_block;
    		return create_else_block;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			main = element("main");
    			h1 = element("h1");
    			h1.textContent = "Image Optimizer";
    			t1 = space();
    			div0 = element("div");
    			if_block.c();
    			t2 = space();
    			div1 = element("div");
    			input = element("input");
    			add_location(h1, file, 73, 1, 1465);
    			attr_dev(div0, "id", "images");
    			attr_dev(div0, "class", "svelte-1gglsns");
    			add_location(div0, file, 74, 1, 1492);
    			input.disabled = /*disabled*/ ctx[2];
    			attr_dev(input, "type", "button");
    			input.value = "⚙️ Optimize";
    			add_location(input, file, 114, 2, 2990);
    			attr_dev(div1, "id", "buttons");
    			add_location(div1, file, 113, 1, 2968);
    			attr_dev(main, "class", "svelte-1gglsns");
    			add_location(main, file, 72, 0, 1456);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, h1);
    			append_dev(main, t1);
    			append_dev(main, div0);
    			if_block.m(div0, null);
    			append_dev(main, t2);
    			append_dev(main, div1);
    			append_dev(div1, input);

    			if (!mounted) {
    				dispose = listen_dev(input, "click", /*optimize*/ ctx[3], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(div0, null);
    				}
    			}

    			if (dirty & /*disabled*/ 4) {
    				prop_dev(input, "disabled", /*disabled*/ ctx[2]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			if_block.d();
    			mounted = false;
    			dispose();
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

    function ext(filename) {
    	return filename.substring(filename.lastIndexOf(".") + 1);
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
    	let sse;
    	let images = [];
    	let config = {};

    	async function updateImages() {
    		const res = await apiRequest({ method: "imagesList" });
    		$$invalidate(0, images = res.data.images);
    		console.log(images);
    	}

    	async function updateConfig() {
    		const res = await apiRequest({ method: "imagesConfig" });
    		$$invalidate(1, config = res.data.config);
    		console.log(config);
    	}

    	async function optimize() {
    		const res = await apiRequest({ method: "optimizeImages", config });

    		if (res.ok && res.output) ; //
    	}

    	onMount(async () => {
    		await updateImages();
    		await updateConfig();
    		sse = new EventSource("/sse?events=watcher");

    		sse.onmessage = async function (event) {
    			const data = JSON.parse(event.data);

    			if (data.subsystem === "images") {
    				console.log(data);
    				await updateImages();
    			}
    		};
    	});

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	function input0_change_input_handler(imageFile) {
    		config[imageFile].quality = to_number(this.value);
    		$$invalidate(1, config);
    	}

    	function input1_input_handler(imageFile) {
    		config[imageFile].quality = to_number(this.value);
    		$$invalidate(1, config);
    	}

    	function input2_change_handler(imageFile) {
    		config[imageFile].options.compress.progressive = this.value;
    		$$invalidate(1, config);
    	}

    	const func = imageFile => ext(imageFile) === "jpg";

    	function input3_change_handler(imageFile) {
    		config[imageFile].options.compress.grayscale = this.value;
    		$$invalidate(1, config);
    	}

    	const func_1 = imageFile => ext(imageFile) === "jpg";

    	$$self.$capture_state = () => ({
    		onMount,
    		sse,
    		images,
    		config,
    		ext,
    		apiRequest,
    		updateImages,
    		updateConfig,
    		optimize,
    		disabled
    	});

    	$$self.$inject_state = $$props => {
    		if ('sse' in $$props) sse = $$props.sse;
    		if ('images' in $$props) $$invalidate(0, images = $$props.images);
    		if ('config' in $$props) $$invalidate(1, config = $$props.config);
    		if ('disabled' in $$props) $$invalidate(2, disabled = $$props.disabled);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*images*/ 1) {
    			$$invalidate(2, disabled = images.length === 0);
    		}
    	};

    	return [
    		images,
    		config,
    		disabled,
    		optimize,
    		input0_change_input_handler,
    		input1_input_handler,
    		input2_change_handler,
    		func,
    		input3_change_handler,
    		func_1
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
