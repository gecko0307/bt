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
    function select_option(select, value) {
        for (let i = 0; i < select.options.length; i += 1) {
            const option = select.options[i];
            if (option.__value === value) {
                option.selected = true;
                return;
            }
        }
        select.selectedIndex = -1; // no option should be selected
    }
    function select_value(select) {
        const selected_option = select.querySelector(':checked') || select.options[0];
        return selected_option && selected_option.__value;
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
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function create_component(block) {
        block && block.c();
    }
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

    /* src\ImageSettings.svelte generated by Svelte v3.47.0 */
    const file$1 = "src\\ImageSettings.svelte";

    // (45:8) {#if !data.options.compress.lossless}
    function create_if_block_1$1(ctx) {
    	let div0;
    	let p;
    	let t0;
    	let t1;
    	let input0;
    	let t2;
    	let div1;
    	let input1;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div0 = element("div");
    			p = element("p");
    			t0 = text(/*qualityText*/ ctx[2]);
    			t1 = space();
    			input0 = element("input");
    			t2 = space();
    			div1 = element("div");
    			input1 = element("input");
    			add_location(p, file$1, 46, 16, 1471);
    			attr_dev(input0, "type", "range");
    			attr_dev(input0, "min", "1");
    			attr_dev(input0, "max", "100");
    			attr_dev(input0, "step", "1");
    			attr_dev(input0, "class", "svelte-y8q7k9");
    			add_location(input0, file$1, 47, 16, 1509);
    			attr_dev(div0, "class", "widget anyFormat svelte-y8q7k9");
    			add_location(div0, file$1, 45, 12, 1423);
    			attr_dev(input1, "type", "number");
    			attr_dev(input1, "min", "1");
    			attr_dev(input1, "max", "100");
    			attr_dev(input1, "step", "1");
    			add_location(input1, file$1, 50, 16, 1690);
    			attr_dev(div1, "class", "widget anyFormat svelte-y8q7k9");
    			set_style(div1, "padding-top", "14px");
    			add_location(div1, file$1, 49, 12, 1616);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div0, anchor);
    			append_dev(div0, p);
    			append_dev(p, t0);
    			append_dev(div0, t1);
    			append_dev(div0, input0);
    			set_input_value(input0, /*data*/ ctx[0].quality);
    			insert_dev(target, t2, anchor);
    			insert_dev(target, div1, anchor);
    			append_dev(div1, input1);
    			set_input_value(input1, /*data*/ ctx[0].quality);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "change", /*input0_change_input_handler*/ ctx[9]),
    					listen_dev(input0, "input", /*input0_change_input_handler*/ ctx[9]),
    					listen_dev(input1, "input", /*input1_input_handler*/ ctx[10])
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*qualityText*/ 4) set_data_dev(t0, /*qualityText*/ ctx[2]);

    			if (dirty & /*data*/ 1) {
    				set_input_value(input0, /*data*/ ctx[0].quality);
    			}

    			if (dirty & /*data*/ 1 && to_number(input1.value) !== /*data*/ ctx[0].quality) {
    				set_input_value(input1, /*data*/ ctx[0].quality);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div0);
    			if (detaching) detach_dev(t2);
    			if (detaching) detach_dev(div1);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$1.name,
    		type: "if",
    		source: "(45:8) {#if !data.options.compress.lossless}",
    		ctx
    	});

    	return block;
    }

    // (81:8) {#if !data.options.compress.lossless}
    function create_if_block$1(ctx) {
    	let div0;
    	let p0;
    	let t1;
    	let select0;
    	let option0;
    	let option1;
    	let option2;
    	let option3;
    	let option4;
    	let option5;
    	let option6;
    	let option7;
    	let option8;
    	let option9;
    	let option10;
    	let t13;
    	let div1;
    	let p1;
    	let t15;
    	let select1;
    	let option11;
    	let option12;
    	let option13;
    	let option14;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div0 = element("div");
    			p0 = element("p");
    			p0.textContent = "Dithering";
    			t1 = space();
    			select0 = element("select");
    			option0 = element("option");
    			option0.textContent = "Nearest";
    			option1 = element("option");
    			option1.textContent = "Riemersma";
    			option2 = element("option");
    			option2.textContent = "Floyd-Steinberg";
    			option3 = element("option");
    			option3.textContent = "False Floyd-Steinberg";
    			option4 = element("option");
    			option4.textContent = "Stucki";
    			option5 = element("option");
    			option5.textContent = "Atkinson";
    			option6 = element("option");
    			option6.textContent = "Burkes";
    			option7 = element("option");
    			option7.textContent = "Sierra";
    			option8 = element("option");
    			option8.textContent = "Two-Sierra";
    			option9 = element("option");
    			option9.textContent = "Sierra Lite";
    			option10 = element("option");
    			option10.textContent = "Jarvis";
    			t13 = space();
    			div1 = element("div");
    			p1 = element("p");
    			p1.textContent = "Palette quantization";
    			t15 = space();
    			select1 = element("select");
    			option11 = element("option");
    			option11.textContent = "NeuQuant";
    			option12 = element("option");
    			option12.textContent = "NeuQuant (float)";
    			option13 = element("option");
    			option13.textContent = "RGBQuant";
    			option14 = element("option");
    			option14.textContent = "WuQuant";
    			add_location(p0, file$1, 82, 16, 2897);
    			option0.__value = "nearest";
    			option0.value = option0.__value;
    			add_location(option0, file$1, 84, 20, 3011);
    			option1.__value = "riemersma";
    			option1.value = option1.__value;
    			add_location(option1, file$1, 85, 5, 3058);
    			option2.__value = "floyd-steinberg";
    			option2.value = option2.__value;
    			add_location(option2, file$1, 86, 5, 3109);
    			option3.__value = "false-floyd-steinberg";
    			option3.value = option3.__value;
    			add_location(option3, file$1, 87, 5, 3172);
    			option4.__value = "stucki";
    			option4.value = option4.__value;
    			add_location(option4, file$1, 88, 5, 3247);
    			option5.__value = "atkinson";
    			option5.value = option5.__value;
    			option5.selected = true;
    			add_location(option5, file$1, 89, 5, 3292);
    			option6.__value = "burkes";
    			option6.value = option6.__value;
    			add_location(option6, file$1, 90, 5, 3350);
    			option7.__value = "sierra";
    			option7.value = option7.__value;
    			add_location(option7, file$1, 91, 5, 3395);
    			option8.__value = "two-sierra";
    			option8.value = option8.__value;
    			add_location(option8, file$1, 92, 5, 3440);
    			option9.__value = "sierra-lite";
    			option9.value = option9.__value;
    			add_location(option9, file$1, 93, 5, 3493);
    			option10.__value = "jarvis";
    			option10.value = option10.__value;
    			add_location(option10, file$1, 94, 5, 3548);
    			if (/*data*/ ctx[0].options.compress.imageDithering === void 0) add_render_callback(() => /*select0_change_handler*/ ctx[15].call(select0));
    			add_location(select0, file$1, 83, 16, 2931);
    			attr_dev(div0, "class", "widget svelte-y8q7k9");
    			toggle_class(div0, "pngOnly", /*pngOnly*/ ctx[6]);
    			add_location(div0, file$1, 81, 12, 2845);
    			add_location(p1, file$1, 98, 16, 3699);
    			option11.__value = "neuquant";
    			option11.value = option11.__value;
    			add_location(option11, file$1, 100, 5, 3811);
    			option12.__value = "neuquant-float";
    			option12.value = option12.__value;
    			add_location(option12, file$1, 101, 5, 3860);
    			option13.__value = "rgbquant";
    			option13.value = option13.__value;
    			add_location(option13, file$1, 102, 5, 3923);
    			option14.__value = "wuquant";
    			option14.value = option14.__value;
    			option14.selected = true;
    			add_location(option14, file$1, 103, 5, 3972);
    			if (/*data*/ ctx[0].options.compress.paletteDithering === void 0) add_render_callback(() => /*select1_change_handler*/ ctx[16].call(select1));
    			add_location(select1, file$1, 99, 16, 3744);
    			attr_dev(div1, "class", "widget svelte-y8q7k9");
    			toggle_class(div1, "pngOnly", /*pngOnly*/ ctx[6]);
    			add_location(div1, file$1, 97, 12, 3647);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div0, anchor);
    			append_dev(div0, p0);
    			append_dev(div0, t1);
    			append_dev(div0, select0);
    			append_dev(select0, option0);
    			append_dev(select0, option1);
    			append_dev(select0, option2);
    			append_dev(select0, option3);
    			append_dev(select0, option4);
    			append_dev(select0, option5);
    			append_dev(select0, option6);
    			append_dev(select0, option7);
    			append_dev(select0, option8);
    			append_dev(select0, option9);
    			append_dev(select0, option10);
    			select_option(select0, /*data*/ ctx[0].options.compress.imageDithering);
    			insert_dev(target, t13, anchor);
    			insert_dev(target, div1, anchor);
    			append_dev(div1, p1);
    			append_dev(div1, t15);
    			append_dev(div1, select1);
    			append_dev(select1, option11);
    			append_dev(select1, option12);
    			append_dev(select1, option13);
    			append_dev(select1, option14);
    			select_option(select1, /*data*/ ctx[0].options.compress.paletteDithering);

    			if (!mounted) {
    				dispose = [
    					listen_dev(select0, "change", /*select0_change_handler*/ ctx[15]),
    					listen_dev(select1, "change", /*select1_change_handler*/ ctx[16])
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*data*/ 1) {
    				select_option(select0, /*data*/ ctx[0].options.compress.imageDithering);
    			}

    			if (dirty & /*pngOnly*/ 64) {
    				toggle_class(div0, "pngOnly", /*pngOnly*/ ctx[6]);
    			}

    			if (dirty & /*data*/ 1) {
    				select_option(select1, /*data*/ ctx[0].options.compress.paletteDithering);
    			}

    			if (dirty & /*pngOnly*/ 64) {
    				toggle_class(div1, "pngOnly", /*pngOnly*/ ctx[6]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div0);
    			if (detaching) detach_dev(t13);
    			if (detaching) detach_dev(div1);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(81:8) {#if !data.options.compress.lossless}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let main;
    	let div7;
    	let div0;
    	let a;
    	let img;
    	let img_src_value;
    	let a_href_value;
    	let t0;
    	let div1;
    	let p;
    	let t2;
    	let select;
    	let option0;
    	let option1;
    	let option2;
    	let option3;
    	let t7;
    	let t8;
    	let div2;
    	let label0;
    	let input0;
    	let t9;
    	let t10;
    	let div3;
    	let label1;
    	let input1;
    	let t11;
    	let t12;
    	let div4;
    	let label2;
    	let input2;
    	let t13;
    	let t14;
    	let div5;
    	let label3;
    	let input3;
    	let t15;
    	let t16;
    	let t17;
    	let div6;
    	let label4;
    	let input4;
    	let t18;
    	let mounted;
    	let dispose;
    	let if_block0 = !/*data*/ ctx[0].options.compress.lossless && create_if_block_1$1(ctx);
    	let if_block1 = !/*data*/ ctx[0].options.compress.lossless && create_if_block$1(ctx);

    	const block = {
    		c: function create() {
    			main = element("main");
    			div7 = element("div");
    			div0 = element("div");
    			a = element("a");
    			img = element("img");
    			t0 = space();
    			div1 = element("div");
    			p = element("p");
    			p.textContent = "Format";
    			t2 = space();
    			select = element("select");
    			option0 = element("option");
    			option0.textContent = "PNG";
    			option1 = element("option");
    			option1.textContent = "JPEG";
    			option2 = element("option");
    			option2.textContent = "WebP";
    			option3 = element("option");
    			option3.textContent = "SVG";
    			t7 = space();
    			if (if_block0) if_block0.c();
    			t8 = space();
    			div2 = element("div");
    			label0 = element("label");
    			input0 = element("input");
    			t9 = text("Progressive");
    			t10 = space();
    			div3 = element("div");
    			label1 = element("label");
    			input1 = element("input");
    			t11 = text("\r\n                Grayscale");
    			t12 = space();
    			div4 = element("div");
    			label2 = element("label");
    			input2 = element("input");
    			t13 = text("\r\n                Pretty");
    			t14 = space();
    			div5 = element("div");
    			label3 = element("label");
    			input3 = element("input");
    			t15 = text("\r\n                Lossless");
    			t16 = space();
    			if (if_block1) if_block1.c();
    			t17 = space();
    			div6 = element("div");
    			label4 = element("label");
    			input4 = element("input");
    			t18 = text("\r\n                Inline");
    			attr_dev(img, "class", "thumb_image svelte-y8q7k9");
    			if (!src_url_equal(img.src, img_src_value = "/file?path=" + /*imagePath*/ ctx[7])) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", /*filename*/ ctx[1]);
    			add_location(img, file$1, 30, 16, 883);
    			attr_dev(a, "href", a_href_value = "/file?path=" + /*imagePath*/ ctx[7]);
    			attr_dev(a, "target", "_blank");
    			add_location(a, file$1, 29, 12, 816);
    			attr_dev(div0, "class", "thumb svelte-y8q7k9");
    			add_location(div0, file$1, 28, 8, 783);
    			add_location(p, file$1, 35, 12, 1044);
    			option0.__value = "png";
    			option0.value = option0.__value;
    			add_location(option0, file$1, 37, 16, 1136);
    			option1.__value = "jpg";
    			option1.value = option1.__value;
    			add_location(option1, file$1, 38, 16, 1186);
    			option2.__value = "webp";
    			option2.value = option2.__value;
    			add_location(option2, file$1, 39, 16, 1237);
    			option3.__value = "svg";
    			option3.value = option3.__value;
    			add_location(option3, file$1, 40, 16, 1289);
    			if (/*data*/ ctx[0].options.outputFormat === void 0) add_render_callback(() => /*select_change_handler*/ ctx[8].call(select));
    			add_location(select, file$1, 36, 12, 1071);
    			attr_dev(div1, "class", "widget anyFormat svelte-y8q7k9");
    			add_location(div1, file$1, 34, 8, 1000);
    			attr_dev(input0, "type", "checkbox");
    			attr_dev(input0, "class", "svelte-y8q7k9");
    			add_location(input0, file$1, 56, 16, 1910);
    			add_location(label0, file$1, 55, 12, 1885);
    			attr_dev(div2, "class", "widget svelte-y8q7k9");
    			set_style(div2, "padding-top", "14px");
    			toggle_class(div2, "jpgOnly", /*jpgOnly*/ ctx[5]);
    			add_location(div2, file$1, 54, 8, 1811);
    			attr_dev(input1, "type", "checkbox");
    			attr_dev(input1, "class", "svelte-y8q7k9");
    			add_location(input1, file$1, 61, 16, 2142);
    			add_location(label1, file$1, 60, 12, 2117);
    			attr_dev(div3, "class", "widget svelte-y8q7k9");
    			set_style(div3, "padding-top", "14px");
    			toggle_class(div3, "jpgOnly", /*jpgOnly*/ ctx[5]);
    			add_location(div3, file$1, 59, 8, 2043);
    			attr_dev(input2, "type", "checkbox");
    			attr_dev(input2, "class", "svelte-y8q7k9");
    			add_location(input2, file$1, 68, 16, 2390);
    			add_location(label2, file$1, 67, 12, 2365);
    			attr_dev(div4, "class", "widget svelte-y8q7k9");
    			set_style(div4, "padding-top", "14px");
    			toggle_class(div4, "svgOnly", /*svgOnly*/ ctx[4]);
    			add_location(div4, file$1, 66, 8, 2291);
    			attr_dev(input3, "type", "checkbox");
    			attr_dev(input3, "class", "svelte-y8q7k9");
    			add_location(input3, file$1, 75, 16, 2647);
    			add_location(label3, file$1, 74, 12, 2622);
    			attr_dev(div5, "class", "widget svelte-y8q7k9");
    			set_style(div5, "padding-top", "14px");
    			toggle_class(div5, "pngOnly", /*pngOnly*/ ctx[6]);
    			toggle_class(div5, "webpOnly", /*webpOnly*/ ctx[3]);
    			add_location(div5, file$1, 73, 8, 2533);
    			attr_dev(input4, "type", "checkbox");
    			attr_dev(input4, "class", "svelte-y8q7k9");
    			add_location(input4, file$1, 110, 16, 4178);
    			add_location(label4, file$1, 109, 12, 4153);
    			attr_dev(div6, "class", "widget anyFormat svelte-y8q7k9");
    			set_style(div6, "padding-top", "14px");
    			add_location(div6, file$1, 108, 8, 4083);
    			attr_dev(div7, "class", "row");
    			add_location(div7, file$1, 27, 4, 756);
    			attr_dev(main, "class", "svelte-y8q7k9");
    			add_location(main, file$1, 26, 0, 744);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, div7);
    			append_dev(div7, div0);
    			append_dev(div0, a);
    			append_dev(a, img);
    			append_dev(div7, t0);
    			append_dev(div7, div1);
    			append_dev(div1, p);
    			append_dev(div1, t2);
    			append_dev(div1, select);
    			append_dev(select, option0);
    			append_dev(select, option1);
    			append_dev(select, option2);
    			append_dev(select, option3);
    			select_option(select, /*data*/ ctx[0].options.outputFormat);
    			append_dev(div7, t7);
    			if (if_block0) if_block0.m(div7, null);
    			append_dev(div7, t8);
    			append_dev(div7, div2);
    			append_dev(div2, label0);
    			append_dev(label0, input0);
    			input0.checked = /*data*/ ctx[0].options.compress.progressive;
    			append_dev(label0, t9);
    			append_dev(div7, t10);
    			append_dev(div7, div3);
    			append_dev(div3, label1);
    			append_dev(label1, input1);
    			input1.checked = /*data*/ ctx[0].options.compress.grayscale;
    			append_dev(label1, t11);
    			append_dev(div7, t12);
    			append_dev(div7, div4);
    			append_dev(div4, label2);
    			append_dev(label2, input2);
    			input2.checked = /*data*/ ctx[0].options.compress.pretty;
    			append_dev(label2, t13);
    			append_dev(div7, t14);
    			append_dev(div7, div5);
    			append_dev(div5, label3);
    			append_dev(label3, input3);
    			input3.checked = /*data*/ ctx[0].options.compress.lossless;
    			append_dev(label3, t15);
    			append_dev(div7, t16);
    			if (if_block1) if_block1.m(div7, null);
    			append_dev(div7, t17);
    			append_dev(div7, div6);
    			append_dev(div6, label4);
    			append_dev(label4, input4);
    			input4.checked = /*data*/ ctx[0].options.compress.inline;
    			append_dev(label4, t18);

    			if (!mounted) {
    				dispose = [
    					listen_dev(select, "change", /*select_change_handler*/ ctx[8]),
    					listen_dev(input0, "change", /*input0_change_handler*/ ctx[11]),
    					listen_dev(input1, "change", /*input1_change_handler*/ ctx[12]),
    					listen_dev(input2, "change", /*input2_change_handler*/ ctx[13]),
    					listen_dev(input3, "change", /*input3_change_handler*/ ctx[14]),
    					listen_dev(input4, "change", /*input4_change_handler*/ ctx[17])
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*imagePath*/ 128 && !src_url_equal(img.src, img_src_value = "/file?path=" + /*imagePath*/ ctx[7])) {
    				attr_dev(img, "src", img_src_value);
    			}

    			if (dirty & /*filename*/ 2) {
    				attr_dev(img, "alt", /*filename*/ ctx[1]);
    			}

    			if (dirty & /*imagePath*/ 128 && a_href_value !== (a_href_value = "/file?path=" + /*imagePath*/ ctx[7])) {
    				attr_dev(a, "href", a_href_value);
    			}

    			if (dirty & /*data*/ 1) {
    				select_option(select, /*data*/ ctx[0].options.outputFormat);
    			}

    			if (!/*data*/ ctx[0].options.compress.lossless) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_1$1(ctx);
    					if_block0.c();
    					if_block0.m(div7, t8);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (dirty & /*data*/ 1) {
    				input0.checked = /*data*/ ctx[0].options.compress.progressive;
    			}

    			if (dirty & /*jpgOnly*/ 32) {
    				toggle_class(div2, "jpgOnly", /*jpgOnly*/ ctx[5]);
    			}

    			if (dirty & /*data*/ 1) {
    				input1.checked = /*data*/ ctx[0].options.compress.grayscale;
    			}

    			if (dirty & /*jpgOnly*/ 32) {
    				toggle_class(div3, "jpgOnly", /*jpgOnly*/ ctx[5]);
    			}

    			if (dirty & /*data*/ 1) {
    				input2.checked = /*data*/ ctx[0].options.compress.pretty;
    			}

    			if (dirty & /*svgOnly*/ 16) {
    				toggle_class(div4, "svgOnly", /*svgOnly*/ ctx[4]);
    			}

    			if (dirty & /*data*/ 1) {
    				input3.checked = /*data*/ ctx[0].options.compress.lossless;
    			}

    			if (dirty & /*pngOnly*/ 64) {
    				toggle_class(div5, "pngOnly", /*pngOnly*/ ctx[6]);
    			}

    			if (dirty & /*webpOnly*/ 8) {
    				toggle_class(div5, "webpOnly", /*webpOnly*/ ctx[3]);
    			}

    			if (!/*data*/ ctx[0].options.compress.lossless) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block$1(ctx);
    					if_block1.c();
    					if_block1.m(div7, t17);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (dirty & /*data*/ 1) {
    				input4.checked = /*data*/ ctx[0].options.compress.inline;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function _qualityText(fmt) {
    	if (fmt === "webp") return "Quality"; else if (fmt === "jpg") return "Quality"; else if (fmt === "png") return "Quality"; else if (fmt === "svg") return "Precision";
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let imagePath;
    	let pngOnly;
    	let jpgOnly;
    	let svgOnly;
    	let webpOnly;
    	let qualityText;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('ImageSettings', slots, []);
    	let { filename = "" } = $$props;
    	let { data = {} } = $$props;

    	onMount(async () => {
    		
    	});

    	const writable_props = ['filename', 'data'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<ImageSettings> was created with unknown prop '${key}'`);
    	});

    	function select_change_handler() {
    		data.options.outputFormat = select_value(this);
    		$$invalidate(0, data);
    	}

    	function input0_change_input_handler() {
    		data.quality = to_number(this.value);
    		$$invalidate(0, data);
    	}

    	function input1_input_handler() {
    		data.quality = to_number(this.value);
    		$$invalidate(0, data);
    	}

    	function input0_change_handler() {
    		data.options.compress.progressive = this.checked;
    		$$invalidate(0, data);
    	}

    	function input1_change_handler() {
    		data.options.compress.grayscale = this.checked;
    		$$invalidate(0, data);
    	}

    	function input2_change_handler() {
    		data.options.compress.pretty = this.checked;
    		$$invalidate(0, data);
    	}

    	function input3_change_handler() {
    		data.options.compress.lossless = this.checked;
    		$$invalidate(0, data);
    	}

    	function select0_change_handler() {
    		data.options.compress.imageDithering = select_value(this);
    		$$invalidate(0, data);
    	}

    	function select1_change_handler() {
    		data.options.compress.paletteDithering = select_value(this);
    		$$invalidate(0, data);
    	}

    	function input4_change_handler() {
    		data.options.compress.inline = this.checked;
    		$$invalidate(0, data);
    	}

    	$$self.$$set = $$props => {
    		if ('filename' in $$props) $$invalidate(1, filename = $$props.filename);
    		if ('data' in $$props) $$invalidate(0, data = $$props.data);
    	};

    	$$self.$capture_state = () => ({
    		onMount,
    		filename,
    		data,
    		_qualityText,
    		qualityText,
    		webpOnly,
    		svgOnly,
    		jpgOnly,
    		pngOnly,
    		imagePath
    	});

    	$$self.$inject_state = $$props => {
    		if ('filename' in $$props) $$invalidate(1, filename = $$props.filename);
    		if ('data' in $$props) $$invalidate(0, data = $$props.data);
    		if ('qualityText' in $$props) $$invalidate(2, qualityText = $$props.qualityText);
    		if ('webpOnly' in $$props) $$invalidate(3, webpOnly = $$props.webpOnly);
    		if ('svgOnly' in $$props) $$invalidate(4, svgOnly = $$props.svgOnly);
    		if ('jpgOnly' in $$props) $$invalidate(5, jpgOnly = $$props.jpgOnly);
    		if ('pngOnly' in $$props) $$invalidate(6, pngOnly = $$props.pngOnly);
    		if ('imagePath' in $$props) $$invalidate(7, imagePath = $$props.imagePath);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*filename*/ 2) {
    			$$invalidate(7, imagePath = "Images/" + filename);
    		}

    		if ($$self.$$.dirty & /*data*/ 1) {
    			$$invalidate(6, pngOnly = data.options.outputFormat === "png");
    		}

    		if ($$self.$$.dirty & /*data*/ 1) {
    			$$invalidate(5, jpgOnly = data.options.outputFormat === "jpg");
    		}

    		if ($$self.$$.dirty & /*data*/ 1) {
    			$$invalidate(4, svgOnly = data.options.outputFormat === "svg");
    		}

    		if ($$self.$$.dirty & /*data*/ 1) {
    			$$invalidate(3, webpOnly = data.options.outputFormat === "webp");
    		}

    		if ($$self.$$.dirty & /*data*/ 1) {
    			$$invalidate(2, qualityText = _qualityText(data.options.outputFormat));
    		}
    	};

    	return [
    		data,
    		filename,
    		qualityText,
    		webpOnly,
    		svgOnly,
    		jpgOnly,
    		pngOnly,
    		imagePath,
    		select_change_handler,
    		input0_change_input_handler,
    		input1_input_handler,
    		input0_change_handler,
    		input1_change_handler,
    		input2_change_handler,
    		input3_change_handler,
    		select0_change_handler,
    		select1_change_handler,
    		input4_change_handler
    	];
    }

    class ImageSettings extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { filename: 1, data: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ImageSettings",
    			options,
    			id: create_fragment$1.name
    		});
    	}

    	get filename() {
    		throw new Error("<ImageSettings>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set filename(value) {
    		throw new Error("<ImageSettings>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get data() {
    		throw new Error("<ImageSettings>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set data(value) {
    		throw new Error("<ImageSettings>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\App.svelte generated by Svelte v3.47.0 */

    const { console: console_1 } = globals;
    const file = "src\\App.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[7] = list[i];
    	return child_ctx;
    }

    // (80:2) {:else}
    function create_else_block(ctx) {
    	let p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "No images found in \"Images\" directory";
    			add_location(p, file, 80, 3, 1679);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(80:2) {:else}",
    		ctx
    	});

    	return block;
    }

    // (69:2) {#if images.length > 0}
    function create_if_block(ctx) {
    	let each_1_anchor;
    	let current;
    	let each_value = /*images*/ ctx[0];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

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
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*images, config*/ 3) {
    				each_value = /*images*/ ctx[0];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
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
    		source: "(69:2) {#if images.length > 0}",
    		ctx
    	});

    	return block;
    }

    // (71:4) {#if imageFile in config}
    function create_if_block_1(ctx) {
    	let div;
    	let fieldset;
    	let legend;
    	let b;
    	let t0_value = /*imageFile*/ ctx[7] + "";
    	let t0;
    	let t1;
    	let imagesettings;
    	let t2;
    	let current;

    	imagesettings = new ImageSettings({
    			props: {
    				filename: /*imageFile*/ ctx[7],
    				data: /*config*/ ctx[1][/*imageFile*/ ctx[7]]
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			div = element("div");
    			fieldset = element("fieldset");
    			legend = element("legend");
    			b = element("b");
    			t0 = text(t0_value);
    			t1 = space();
    			create_component(imagesettings.$$.fragment);
    			t2 = space();
    			add_location(b, file, 73, 15, 1509);
    			add_location(legend, file, 73, 7, 1501);
    			add_location(fieldset, file, 72, 6, 1482);
    			attr_dev(div, "class", "image svelte-rgpylm");
    			add_location(div, file, 71, 5, 1455);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, fieldset);
    			append_dev(fieldset, legend);
    			append_dev(legend, b);
    			append_dev(b, t0);
    			append_dev(fieldset, t1);
    			mount_component(imagesettings, fieldset, null);
    			append_dev(div, t2);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if ((!current || dirty & /*images*/ 1) && t0_value !== (t0_value = /*imageFile*/ ctx[7] + "")) set_data_dev(t0, t0_value);
    			const imagesettings_changes = {};
    			if (dirty & /*images*/ 1) imagesettings_changes.filename = /*imageFile*/ ctx[7];
    			if (dirty & /*config, images*/ 3) imagesettings_changes.data = /*config*/ ctx[1][/*imageFile*/ ctx[7]];
    			imagesettings.$set(imagesettings_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(imagesettings.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(imagesettings.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(imagesettings);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(71:4) {#if imageFile in config}",
    		ctx
    	});

    	return block;
    }

    // (70:3) {#each images as imageFile}
    function create_each_block(ctx) {
    	let if_block_anchor;
    	let current;
    	let if_block = /*imageFile*/ ctx[7] in /*config*/ ctx[1] && create_if_block_1(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (/*imageFile*/ ctx[7] in /*config*/ ctx[1]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*images, config*/ 3) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block_1(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
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
    		source: "(70:3) {#each images as imageFile}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let main;
    	let h1;
    	let t1;
    	let div0;
    	let current_block_type_index;
    	let if_block;
    	let t2;
    	let div1;
    	let input;
    	let current;
    	let mounted;
    	let dispose;
    	const if_block_creators = [create_if_block, create_else_block];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*images*/ ctx[0].length > 0) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

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
    			add_location(h1, file, 66, 1, 1314);
    			attr_dev(div0, "id", "images");
    			attr_dev(div0, "class", "svelte-rgpylm");
    			add_location(div0, file, 67, 1, 1341);
    			input.disabled = /*disabled*/ ctx[2];
    			attr_dev(input, "type", "button");
    			input.value = "⚙️ Optimize";
    			add_location(input, file, 84, 2, 1766);
    			attr_dev(div1, "id", "buttons");
    			add_location(div1, file, 83, 1, 1744);
    			attr_dev(main, "class", "svelte-rgpylm");
    			add_location(main, file, 65, 0, 1305);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, h1);
    			append_dev(main, t1);
    			append_dev(main, div0);
    			if_blocks[current_block_type_index].m(div0, null);
    			append_dev(main, t2);
    			append_dev(main, div1);
    			append_dev(div1, input);
    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(input, "click", /*optimize*/ ctx[3], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				} else {
    					if_block.p(ctx, dirty);
    				}

    				transition_in(if_block, 1);
    				if_block.m(div0, null);
    			}

    			if (!current || dirty & /*disabled*/ 4) {
    				prop_dev(input, "disabled", /*disabled*/ ctx[2]);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			if_blocks[current_block_type_index].d();
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

    	$$self.$capture_state = () => ({
    		onMount,
    		ImageSettings,
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

    	return [images, config, disabled, optimize];
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
