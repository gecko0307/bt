var app = (function () {
    'use strict';

    function noop() { }
    const identity = x => x;
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
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
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

    function fade(node, { delay = 0, duration = 400, easing = identity } = {}) {
        const o = +getComputedStyle(node).opacity;
        return {
            delay,
            duration,
            easing,
            css: t => `opacity: ${t * o}`
        };
    }

    /* src\App.svelte generated by Svelte v3.47.0 */

    const { console: console_1 } = globals;
    const file = "src\\App.svelte";

    function create_fragment(ctx) {
    	let main;
    	let div10;
    	let div8;
    	let div1;
    	let div0;
    	let iframe;
    	let iframe_src_value;
    	let t0;
    	let div7;
    	let div6;
    	let div2;
    	let p0;
    	let t2;
    	let input0;
    	let t3;
    	let input1;
    	let t4;
    	let div3;
    	let p1;
    	let t6;
    	let input2;
    	let t7;
    	let div4;
    	let p2;
    	let t9;
    	let input3;
    	let t10;
    	let div5;
    	let p3;
    	let t12;
    	let select;
    	let option0;
    	let option1;
    	let option2;
    	let t16;
    	let input4;
    	let t17;
    	let div9;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			main = element("main");
    			div10 = element("div");
    			div8 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			iframe = element("iframe");
    			t0 = space();
    			div7 = element("div");
    			div6 = element("div");
    			div2 = element("div");
    			p0 = element("p");
    			p0.textContent = "Banner URL";
    			t2 = space();
    			input0 = element("input");
    			t3 = space();
    			input1 = element("input");
    			t4 = space();
    			div3 = element("div");
    			p1 = element("p");
    			p1.textContent = "Width";
    			t6 = space();
    			input2 = element("input");
    			t7 = space();
    			div4 = element("div");
    			p2 = element("p");
    			p2.textContent = "Height";
    			t9 = space();
    			input3 = element("input");
    			t10 = space();
    			div5 = element("div");
    			p3 = element("p");
    			p3.textContent = "Device";
    			t12 = space();
    			select = element("select");
    			option0 = element("option");
    			option0.textContent = "iPhone SE";
    			option1 = element("option");
    			option1.textContent = "iPhone XR";
    			option2 = element("option");
    			option2.textContent = "iPhone 12 Pro";
    			t16 = space();
    			input4 = element("input");
    			t17 = space();
    			div9 = element("div");
    			attr_dev(iframe, "title", "banner");
    			attr_dev(iframe, "id", "banner");
    			if (!src_url_equal(iframe.src, iframe_src_value = "/index.html")) attr_dev(iframe, "src", iframe_src_value);
    			attr_dev(iframe, "frameborder", "0");
    			attr_dev(iframe, "scrolling", "no");
    			attr_dev(iframe, "class", "svelte-lnzoxf");
    			add_location(iframe, file, 105, 5, 2862);
    			attr_dev(div0, "id", "banner_container");
    			attr_dev(div0, "class", "svelte-lnzoxf");
    			add_location(div0, file, 104, 4, 2800);
    			attr_dev(div1, "id", "resize_area");
    			attr_dev(div1, "class", "svelte-lnzoxf");
    			add_location(div1, file, 103, 3, 2772);
    			add_location(p0, file, 111, 6, 3080);
    			attr_dev(input0, "type", "text");
    			attr_dev(input0, "size", "45");
    			set_style(input0, "width", "200px");
    			add_location(input0, file, 112, 6, 3105);
    			attr_dev(input1, "type", "button");
    			input1.value = "↻";
    			attr_dev(input1, "class", "svelte-lnzoxf");
    			add_location(input1, file, 113, 6, 3219);
    			attr_dev(div2, "class", "widget");
    			add_location(div2, file, 110, 5, 3052);
    			add_location(p1, file, 116, 6, 3321);
    			attr_dev(input2, "type", "number");
    			attr_dev(input2, "size", "45");
    			attr_dev(input2, "min", "0");
    			attr_dev(input2, "class", "svelte-lnzoxf");
    			add_location(input2, file, 117, 6, 3341);
    			attr_dev(div3, "class", "widget");
    			add_location(div3, file, 115, 5, 3293);
    			add_location(p2, file, 120, 6, 3483);
    			attr_dev(input3, "type", "number");
    			attr_dev(input3, "size", "45");
    			attr_dev(input3, "min", "0");
    			attr_dev(input3, "class", "svelte-lnzoxf");
    			add_location(input3, file, 121, 6, 3504);
    			attr_dev(div4, "class", "widget");
    			add_location(div4, file, 119, 5, 3455);
    			add_location(p3, file, 124, 6, 3647);
    			option0.__value = "iphone_se";
    			option0.value = option0.__value;
    			add_location(option0, file, 126, 7, 3742);
    			option1.__value = "iphone_xr";
    			option1.value = option1.__value;
    			add_location(option1, file, 127, 7, 3795);
    			option2.__value = "iphone_12_pro";
    			option2.value = option2.__value;
    			add_location(option2, file, 128, 7, 3848);
    			attr_dev(select, "class", "svelte-lnzoxf");
    			if (/*bannerDevice*/ ctx[5] === void 0) add_render_callback(() => /*select_change_handler*/ ctx[16].call(select));
    			add_location(select, file, 125, 6, 3668);
    			attr_dev(input4, "type", "button");
    			input4.value = "Reset";
    			attr_dev(input4, "class", "svelte-lnzoxf");
    			add_location(input4, file, 130, 6, 3925);
    			attr_dev(div5, "class", "widget");
    			add_location(div5, file, 123, 5, 3619);
    			attr_dev(div6, "class", "row");
    			add_location(div6, file, 109, 4, 3028);
    			attr_dev(div7, "id", "size_info");
    			attr_dev(div7, "class", "svelte-lnzoxf");
    			add_location(div7, file, 108, 3, 3002);
    			attr_dev(div8, "id", "preview");
    			attr_dev(div8, "class", "svelte-lnzoxf");
    			add_location(div8, file, 102, 2, 2749);
    			attr_dev(div9, "id", "control");
    			attr_dev(div9, "class", "svelte-lnzoxf");
    			add_location(div9, file, 135, 2, 4038);
    			attr_dev(div10, "id", "ui");
    			attr_dev(div10, "class", "svelte-lnzoxf");
    			add_location(div10, file, 101, 1, 2732);
    			attr_dev(main, "class", "svelte-lnzoxf");
    			add_location(main, file, 100, 0, 2723);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, div10);
    			append_dev(div10, div8);
    			append_dev(div8, div1);
    			append_dev(div1, div0);
    			append_dev(div0, iframe);
    			/*iframe_binding*/ ctx[11](iframe);
    			/*div0_binding*/ ctx[12](div0);
    			append_dev(div8, t0);
    			append_dev(div8, div7);
    			append_dev(div7, div6);
    			append_dev(div6, div2);
    			append_dev(div2, p0);
    			append_dev(div2, t2);
    			append_dev(div2, input0);
    			set_input_value(input0, /*bannerURL*/ ctx[2]);
    			append_dev(div2, t3);
    			append_dev(div2, input1);
    			append_dev(div6, t4);
    			append_dev(div6, div3);
    			append_dev(div3, p1);
    			append_dev(div3, t6);
    			append_dev(div3, input2);
    			set_input_value(input2, /*bannerWidthProp*/ ctx[3]);
    			append_dev(div6, t7);
    			append_dev(div6, div4);
    			append_dev(div4, p2);
    			append_dev(div4, t9);
    			append_dev(div4, input3);
    			set_input_value(input3, /*bannerHeightProp*/ ctx[4]);
    			append_dev(div6, t10);
    			append_dev(div6, div5);
    			append_dev(div5, p3);
    			append_dev(div5, t12);
    			append_dev(div5, select);
    			append_dev(select, option0);
    			append_dev(select, option1);
    			append_dev(select, option2);
    			select_option(select, /*bannerDevice*/ ctx[5]);
    			append_dev(div5, t16);
    			append_dev(div5, input4);
    			append_dev(div10, t17);
    			append_dev(div10, div9);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "input", /*input0_input_handler*/ ctx[13]),
    					listen_dev(input0, "keypress", /*bannerSrcKeyPress*/ ctx[7], false, false, false),
    					listen_dev(input1, "click", /*loadBanner*/ ctx[8], false, false, false),
    					listen_dev(input2, "input", /*input2_input_handler*/ ctx[14]),
    					listen_dev(input2, "input", /*bannerSizeChange*/ ctx[6], false, false, false),
    					listen_dev(input3, "input", /*input3_input_handler*/ ctx[15]),
    					listen_dev(input3, "input", /*bannerSizeChange*/ ctx[6], false, false, false),
    					listen_dev(select, "change", /*select_change_handler*/ ctx[16]),
    					listen_dev(select, "change", /*bannerDeviceChange*/ ctx[9], false, false, false),
    					listen_dev(input4, "click", /*bannerResetSize*/ ctx[10], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*bannerURL*/ 4 && input0.value !== /*bannerURL*/ ctx[2]) {
    				set_input_value(input0, /*bannerURL*/ ctx[2]);
    			}

    			if (dirty & /*bannerWidthProp*/ 8 && to_number(input2.value) !== /*bannerWidthProp*/ ctx[3]) {
    				set_input_value(input2, /*bannerWidthProp*/ ctx[3]);
    			}

    			if (dirty & /*bannerHeightProp*/ 16 && to_number(input3.value) !== /*bannerHeightProp*/ ctx[4]) {
    				set_input_value(input3, /*bannerHeightProp*/ ctx[4]);
    			}

    			if (dirty & /*bannerDevice*/ 32) {
    				select_option(select, /*bannerDevice*/ ctx[5]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			/*iframe_binding*/ ctx[11](null);
    			/*div0_binding*/ ctx[12](null);
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
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	let sse;

    	const screens = {
    		iphone_se: { width: 375, height: 667 },
    		iphone_xr: { width: 414, height: 896 },
    		iphone_12_pro: { width: 390, height: 844 }
    	};

    	let bannerContainer;
    	let banner;
    	let bannerURL = "/index.html";
    	let bannerInternalContainer;
    	let bannerDefaultWidth = 240;
    	let bannerDefaultHeight = 400;
    	let bannerWidth = bannerDefaultWidth;
    	let bannerHeight = bannerDefaultHeight;
    	let bannerWidthProp = bannerWidth;
    	let bannerHeightProp = bannerHeight;
    	let bannerDevice = "default";
    	let observer;

    	onMount(async () => {
    		sse = new EventSource("/sse?events=watcher");

    		sse.onmessage = async function (event) {
    			JSON.parse(event.data);
    		};

    		sse.onerror = function (error) {
    			console.error("EventSource failed: ", error);
    		};

    		$$invalidate(1, banner.onload = bannerOnLoad, banner);

    		observer = new ResizeObserver(mutations => {
    				bannerWidth = mutations[0].contentRect.width;
    				bannerHeight = mutations[0].contentRect.height;
    				$$invalidate(3, bannerWidthProp = bannerWidth);
    				$$invalidate(4, bannerHeightProp = bannerHeight);
    			});

    		observer.observe(bannerContainer);
    	});

    	function bannerOnLoad(event) {
    		console.log("Banner loaded");
    		const bannerWindow = banner.contentWindow;
    		const bannerDocument = bannerWindow.document;
    		bannerInternalContainer = bannerDocument.getElementById("container");

    		if (bannerInternalContainer) {
    			bannerDefaultWidth = bannerInternalContainer.offsetWidth;
    			bannerDefaultHeight = bannerInternalContainer.offsetHeight;
    		}
    	}

    	function bannerSizeChange(event) {
    		observer.disconnect();
    		$$invalidate(0, bannerContainer.style.width = bannerWidthProp + "px", bannerContainer);
    		$$invalidate(0, bannerContainer.style.height = bannerHeightProp + "px", bannerContainer);
    		observer.observe(bannerContainer);
    	}

    	function bannerSrcKeyPress(event) {
    		if (event.charCode === 13) {
    			loadBanner();
    		}
    	}

    	function loadBanner() {
    		$$invalidate(1, banner.src = "", banner);
    		$$invalidate(1, banner.src = bannerURL, banner);
    	}

    	function bannerDeviceChange() {
    		let screen = screens[bannerDevice];
    		$$invalidate(3, bannerWidthProp = screen.width);
    		$$invalidate(4, bannerHeightProp = screen.height);
    		$$invalidate(0, bannerContainer.style.width = bannerWidthProp + "px", bannerContainer);
    		$$invalidate(0, bannerContainer.style.height = bannerHeightProp + "px", bannerContainer);
    	}

    	function bannerResetSize() {
    		$$invalidate(3, bannerWidthProp = bannerDefaultWidth);
    		$$invalidate(4, bannerHeightProp = bannerDefaultHeight);
    		$$invalidate(0, bannerContainer.style.width = bannerWidthProp + "px", bannerContainer);
    		$$invalidate(0, bannerContainer.style.height = bannerHeightProp + "px", bannerContainer);
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	function iframe_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			banner = $$value;
    			$$invalidate(1, banner);
    		});
    	}

    	function div0_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			bannerContainer = $$value;
    			$$invalidate(0, bannerContainer);
    		});
    	}

    	function input0_input_handler() {
    		bannerURL = this.value;
    		$$invalidate(2, bannerURL);
    	}

    	function input2_input_handler() {
    		bannerWidthProp = to_number(this.value);
    		$$invalidate(3, bannerWidthProp);
    	}

    	function input3_input_handler() {
    		bannerHeightProp = to_number(this.value);
    		$$invalidate(4, bannerHeightProp);
    	}

    	function select_change_handler() {
    		bannerDevice = select_value(this);
    		$$invalidate(5, bannerDevice);
    	}

    	$$self.$capture_state = () => ({
    		onMount,
    		fade,
    		sse,
    		screens,
    		bannerContainer,
    		banner,
    		bannerURL,
    		bannerInternalContainer,
    		bannerDefaultWidth,
    		bannerDefaultHeight,
    		bannerWidth,
    		bannerHeight,
    		bannerWidthProp,
    		bannerHeightProp,
    		bannerDevice,
    		observer,
    		apiRequest,
    		bannerOnLoad,
    		bannerSizeChange,
    		bannerSrcKeyPress,
    		loadBanner,
    		bannerDeviceChange,
    		bannerResetSize
    	});

    	$$self.$inject_state = $$props => {
    		if ('sse' in $$props) sse = $$props.sse;
    		if ('bannerContainer' in $$props) $$invalidate(0, bannerContainer = $$props.bannerContainer);
    		if ('banner' in $$props) $$invalidate(1, banner = $$props.banner);
    		if ('bannerURL' in $$props) $$invalidate(2, bannerURL = $$props.bannerURL);
    		if ('bannerInternalContainer' in $$props) bannerInternalContainer = $$props.bannerInternalContainer;
    		if ('bannerDefaultWidth' in $$props) bannerDefaultWidth = $$props.bannerDefaultWidth;
    		if ('bannerDefaultHeight' in $$props) bannerDefaultHeight = $$props.bannerDefaultHeight;
    		if ('bannerWidth' in $$props) bannerWidth = $$props.bannerWidth;
    		if ('bannerHeight' in $$props) bannerHeight = $$props.bannerHeight;
    		if ('bannerWidthProp' in $$props) $$invalidate(3, bannerWidthProp = $$props.bannerWidthProp);
    		if ('bannerHeightProp' in $$props) $$invalidate(4, bannerHeightProp = $$props.bannerHeightProp);
    		if ('bannerDevice' in $$props) $$invalidate(5, bannerDevice = $$props.bannerDevice);
    		if ('observer' in $$props) observer = $$props.observer;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		bannerContainer,
    		banner,
    		bannerURL,
    		bannerWidthProp,
    		bannerHeightProp,
    		bannerDevice,
    		bannerSizeChange,
    		bannerSrcKeyPress,
    		loadBanner,
    		bannerDeviceChange,
    		bannerResetSize,
    		iframe_binding,
    		div0_binding,
    		input0_input_handler,
    		input2_input_handler,
    		input3_input_handler,
    		select_change_handler
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
